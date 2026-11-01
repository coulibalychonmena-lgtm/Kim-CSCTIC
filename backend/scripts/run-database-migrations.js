// Exécute les fichiers de /database/migrations dans l'ordre alphabétique (PostgreSQL / Supabase).
// Chaque fichier n'est joué qu'une fois : la table SCHEMA_MIGRATIONS garde la liste de ceux déjà appliqués.
// Les migrations de données de départ (004, 007) ne sont JAMAIS rejouées : ce que l'administration
// modifie ou supprime ensuite n'est donc jamais recréé. Sur une base déjà en service (tables présentes
// mais aucun suivi), elles sont marquées « appliquées » sans être exécutées.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEnvironmentVariablesPresent, DATABASE_VARIABLE_NAMES } from '../src/config/environment.js';

assertEnvironmentVariablesPresent(DATABASE_VARIABLE_NAMES);
const { query, runSqlScript, closeDatabase } = await import('../src/config/database.js');

const DATA_MIGRATION_PATTERN = /seed|welcome/i;
const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database/migrations');
const migrationFileNames = (await readdir(migrationsDirectory)).filter((fileName) => fileName.endsWith('.sql')).sort();

const tableExists = async (tableName) => {
  const [{ found }] = await query('SELECT to_regclass(?) IS NOT NULL AS FOUND', [`public.${tableName}`]);
  return found;
};
const markApplied = (fileName) =>
  query('INSERT INTO SCHEMA_MIGRATIONS (NAME) VALUES (?) ON CONFLICT (NAME) DO NOTHING', [fileName]);

try {
  const trackingExisted = await tableExists('schema_migrations');
  const databaseAlreadyInUse = await tableExists('rooms');
  await runSqlScript(`CREATE TABLE IF NOT EXISTS SCHEMA_MIGRATIONS (NAME VARCHAR(200) PRIMARY KEY, APPLIED_AT TIMESTAMPTZ DEFAULT NOW());
                      ALTER TABLE SCHEMA_MIGRATIONS ENABLE ROW LEVEL SECURITY;`);
  const appliedNames = new Set((await query('SELECT NAME FROM SCHEMA_MIGRATIONS')).map((row) => row.name));

  for (const fileName of migrationFileNames) {
    if (appliedNames.has(fileName)) continue;
    if (DATA_MIGRATION_PATTERN.test(fileName) && !trackingExisted && databaseAlreadyInUse) {
      console.log(`↷ ${fileName} (données déjà en service : non rejouée)`);
      await markApplied(fileName);
      continue;
    }
    console.log(`→ ${fileName}`);
    await runSqlScript(await readFile(path.join(migrationsDirectory, fileName), 'utf8'));
    await markApplied(fileName);
  }
  console.log('Migrations terminées.');
} catch (migrationError) {
  console.error(`Échec de la migration : ${migrationError.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

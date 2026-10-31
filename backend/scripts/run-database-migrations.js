// Exécute les fichiers de /database/migrations dans l'ordre alphabétique (PostgreSQL / Supabase).
// Chaque fichier est exécuté en une seule transaction et est rejouable sans risque.
// Les migrations créent la structure et le catalogue officiel de départ (007).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEnvironmentVariablesPresent, DATABASE_VARIABLE_NAMES } from '../src/config/environment.js';

assertEnvironmentVariablesPresent(DATABASE_VARIABLE_NAMES);
const { runSqlScript, closeDatabase } = await import('../src/config/database.js');

const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database/migrations');
const migrationFileNames = (await readdir(migrationsDirectory)).filter((fileName) => fileName.endsWith('.sql')).sort();

try {
  for (const fileName of migrationFileNames) {
    console.log(`→ ${fileName}`);
    await runSqlScript(await readFile(path.join(migrationsDirectory, fileName), 'utf8'));
  }
  console.log('Migrations terminées.');
} catch (migrationError) {
  console.error(`Échec de la migration : ${migrationError.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

// Exécute les fichiers de /database/migrations dans l'ordre alphabétique.
// Les migrations ne créent que la structure : aucune donnée n'est insérée.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEnvironmentVariablesPresent, SNOWFLAKE_VARIABLE_NAMES } from '../src/config/environment.js';

assertEnvironmentVariablesPresent(SNOWFLAKE_VARIABLE_NAMES);
const { query } = await import('../src/config/snowflake.js');

const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database/migrations');
const migrationFileNames = (await readdir(migrationsDirectory)).filter((fileName) => fileName.endsWith('.sql')).sort();

for (const fileName of migrationFileNames) {
  const sqlWithoutComments = (await readFile(path.join(migrationsDirectory, fileName), 'utf8')).replace(/--.*$/gm, '');
  const sqlStatements = sqlWithoutComments
    .split(/;[ \t]*\r?\n/)
    .map((statement) => statement.trim().replace(/;$/, ''))
    .filter(Boolean);
  console.log(`→ ${fileName} (${sqlStatements.length} instructions)`);
  for (const statement of sqlStatements) await query(statement);
}
console.log('Migrations terminées.');
process.exit(0);

import pg from 'pg';
import { env } from './environment.js';

// DATE → texte « AAAA-MM-JJ » (et non un objet Date décalé par le fuseau horaire).
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const isLocalDatabase = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.databaseUrl || '');

/** Pool de connexions PostgreSQL (Supabase). SSL obligatoire côté Supabase. */
const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

// Une connexion inactive coupée par le serveur ne doit pas faire tomber l'API.
pool.on('error', (poolError) => console.error('[DB] connexion inactive perdue :', poolError.message));

/** Remplace les marqueurs « ? » par $1, $2… (syntaxe PostgreSQL). */
const toPostgresPlaceholders = (sqlText) => {
  let position = 0;
  return sqlText.replace(/\?/g, () => `$${++position}`);
};

const withLowercaseColumnNames = (row) =>
  Object.fromEntries(Object.entries(row).map(([columnName, value]) => [columnName.toLowerCase(), value]));

/**
 * Exécute une requête SQL paramétrée (binds « ? ») et renvoie les lignes
 * avec des clés en minuscules.
 */
export async function query(sqlText, binds = []) {
  const result = await pool.query(toPostgresPlaceholders(sqlText), binds);
  return result.rows.map(withLowercaseColumnNames);
}

/** Exécute un fichier SQL complet (plusieurs instructions, sans paramètres) en une seule transaction implicite. */
export const runSqlScript = (sqlScript) => pool.query(sqlScript);

export const closeDatabase = () => pool.end();

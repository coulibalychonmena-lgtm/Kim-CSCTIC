import snowflake from 'snowflake-sdk';
import { env } from './environment.js';

snowflake.configure({ logLevel: 'ERROR' });

let activeConnection = null;
let pendingConnection = null;

function openConnection() {
  const newConnection = snowflake.createConnection({
    ...env.snowflake,
    clientSessionKeepAlive: true,
  });
  return new Promise((resolve, reject) => {
    newConnection.connect((connectionError, connectedConnection) =>
      (connectionError ? reject(connectionError) : resolve(connectedConnection)));
  });
}

async function getConnection() {
  if (activeConnection && activeConnection.isUp()) return activeConnection;
  if (!pendingConnection) {
    pendingConnection = openConnection()
      .then((connectedConnection) => { activeConnection = connectedConnection; return connectedConnection; })
      .finally(() => { pendingConnection = null; });
  }
  return pendingConnection;
}

const withLowercaseColumnNames = (row) =>
  Object.fromEntries(Object.entries(row).map(([columnName, value]) => [columnName.toLowerCase(), value]));

/**
 * Exécute une requête SQL paramétrée (binds "?") et renvoie les lignes
 * avec des clés en minuscules.
 */
export async function query(sqlText, binds = []) {
  const connection = await getConnection();
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (executionError, _statement, rows) =>
        (executionError ? reject(executionError) : resolve((rows || []).map(withLowercaseColumnNames))),
    });
  });
}

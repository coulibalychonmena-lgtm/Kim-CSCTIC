/** Les colonnes ARRAY/VARIANT de Snowflake peuvent arriver sous forme de texte JSON. */
export function parseSnowflakeJsonValue(value, fallbackValue = null) {
  if (value === null || value === undefined) return fallbackValue;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallbackValue; }
}

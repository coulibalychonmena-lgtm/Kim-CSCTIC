/** Les colonnes JSONB arrivent déjà décodées ; on tolère aussi un texte JSON. */
export function parseJsonValue(value, fallbackValue = null) {
  if (value === null || value === undefined) return fallbackValue;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallbackValue; }
}

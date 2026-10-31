/**
 * Construit la partie SET d'un UPDATE à partir des seuls champs réellement fournis.
 * Une valeur `null` est écrite telle quelle : c'est ce qui permet à l'administration
 * de vider un champ (par exemple supprimer un quota de places).
 */
export function buildUpdateAssignments(columnByField, changes, { arrayFields = [] } = {}) {
  const assignments = [];
  const binds = [];
  for (const [field, column] of Object.entries(columnByField)) {
    if (changes[field] === undefined) continue;
    if (arrayFields.includes(field)) {
      assignments.push(`${column} = ?::jsonb`);
      binds.push(JSON.stringify(changes[field] ?? []));
    } else {
      assignments.push(`${column} = ?`);
      binds.push(changes[field]);
    }
  }
  return { assignments, binds };
}

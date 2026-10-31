import { query } from '../config/snowflake.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { buildUpdateAssignments } from '../utils/sql-update-builder.js';

const COLUMNS = 'ID, CATEGORY, TITLE, CONTENT, SOURCE_LABEL, SOURCE_URL, UPDATED_AT';

export const listCenterInformation = () =>
  query(`SELECT ${COLUMNS} FROM CENTER_INFORMATION ORDER BY CATEGORY, TITLE`);

export async function createCenterInformation(informationData) {
  const informationId = generateIdentifier();
  await query(
    `INSERT INTO CENTER_INFORMATION (ID, CATEGORY, TITLE, CONTENT, SOURCE_LABEL, SOURCE_URL)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      informationId, informationData.category, informationData.title, informationData.content,
      informationData.source_label ?? null, informationData.source_url ?? null,
    ],
  );
  return { id: informationId, ...informationData };
}

export async function updateCenterInformation(informationId, informationChanges) {
  const [existingInformation] = await query('SELECT ID FROM CENTER_INFORMATION WHERE ID = ?', [informationId]);
  if (!existingInformation) throw new AppError(404, 'Information introuvable.');
  const { assignments, binds } = buildUpdateAssignments(
    {
      category: 'CATEGORY', title: 'TITLE', content: 'CONTENT',
      source_label: 'SOURCE_LABEL', source_url: 'SOURCE_URL',
    },
    informationChanges,
  );
  if (!assignments.length) throw new AppError(400, 'Aucun champ à mettre à jour.');
  await query(
    `UPDATE CENTER_INFORMATION SET ${assignments.join(', ')}, UPDATED_AT = CURRENT_TIMESTAMP() WHERE ID = ?`,
    [...binds, informationId],
  );
  return { id: informationId, ...informationChanges };
}

export async function deleteCenterInformation(informationId) {
  const [existingInformation] = await query('SELECT ID FROM CENTER_INFORMATION WHERE ID = ?', [informationId]);
  if (!existingInformation) throw new AppError(404, 'Information introuvable.');
  await query('DELETE FROM CENTER_INFORMATION WHERE ID = ?', [informationId]);
  return { id: informationId, deleted: true };
}

import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { buildUpdateAssignments } from '../utils/sql-update-builder.js';

/** CRUD générique d'une rubrique éditoriale (événements, actualités) gérée depuis /admin. */
function createEntriesService({ table, label, columnByField, publicFilter, publicOrder, adminOrder }) {
  const selectColumns = `ID, ${Object.values(columnByField).join(', ')}`;
  const findOrFail = async (entryId) => {
    const [entry] = await query(`SELECT ID FROM ${table} WHERE ID = ?`, [entryId]);
    if (!entry) throw new AppError(404, `${label} introuvable.`);
  };
  return {
    listPublished: () => query(`SELECT ${selectColumns} FROM ${table} WHERE IS_PUBLISHED = TRUE AND ${publicFilter} ORDER BY ${publicOrder} LIMIT 60`),
    listAll: () => query(`SELECT ${selectColumns} FROM ${table} ORDER BY ${adminOrder}`),
    async create(entryData) {
      const providedFields = Object.keys(columnByField).filter((field) => entryData[field] !== undefined);
      const entryId = generateIdentifier();
      await query(
        `INSERT INTO ${table} (ID, ${providedFields.map((field) => columnByField[field]).join(', ')})
         VALUES (?, ${providedFields.map(() => '?').join(', ')})`,
        [entryId, ...providedFields.map((field) => entryData[field])],
      );
      return { id: entryId, ...entryData };
    },
    async update(entryId, entryChanges) {
      await findOrFail(entryId);
      const { assignments, binds } = buildUpdateAssignments(columnByField, entryChanges);
      if (!assignments.length) throw new AppError(400, 'Aucun champ à mettre à jour.');
      await query(`UPDATE ${table} SET ${assignments.join(', ')} WHERE ID = ?`, [...binds, entryId]);
      return { id: entryId, ...entryChanges };
    },
    async remove(entryId) {
      await findOrFail(entryId);
      await query(`DELETE FROM ${table} WHERE ID = ?`, [entryId]);
      return { id: entryId, deleted: true };
    },
  };
}

export const eventsService = createEntriesService({
  table: 'EVENTS', label: 'Événement',
  columnByField: {
    title: 'TITLE', description: 'DESCRIPTION', location: 'LOCATION', starts_at: 'STARTS_AT',
    ends_at: 'ENDS_AT', image_url: 'IMAGE_URL', is_published: 'IS_PUBLISHED',
  },
  publicFilter: "COALESCE(ENDS_AT, STARTS_AT + INTERVAL '1 day') >= NOW()",
  publicOrder: 'STARTS_AT ASC', adminOrder: 'STARTS_AT DESC',
});

export const newsService = createEntriesService({
  table: 'NEWS', label: 'Actualité',
  columnByField: {
    title: 'TITLE', summary: 'SUMMARY', content: 'CONTENT', image_url: 'IMAGE_URL',
    published_at: 'PUBLISHED_AT', is_published: 'IS_PUBLISHED',
  },
  publicFilter: 'PUBLISHED_AT <= NOW()',
  publicOrder: 'PUBLISHED_AT DESC', adminOrder: 'PUBLISHED_AT DESC',
});

export const videosService = createEntriesService({
  table: 'PROMO_VIDEOS', label: 'Vidéo',
  columnByField: {
    title: 'TITLE', description: 'DESCRIPTION', video_url: 'VIDEO_URL', sort_order: 'SORT_ORDER',
    is_published: 'IS_PUBLISHED', created_at: 'CREATED_AT',
  },
  publicFilter: 'TRUE', publicOrder: 'SORT_ORDER ASC, CREATED_AT DESC', adminOrder: 'SORT_ORDER ASC, CREATED_AT DESC',
});

export const suggestionsService = createEntriesService({
  table: 'CHAT_SUGGESTIONS', label: 'Suggestion',
  columnByField: {
    label: 'LABEL', label_en: 'LABEL_EN', label_ko: 'LABEL_KO', message: 'MESSAGE',
    action_type: 'ACTION_TYPE', sort_order: 'SORT_ORDER', is_published: 'IS_PUBLISHED',
  },
  publicFilter: 'TRUE', publicOrder: 'SORT_ORDER ASC, LABEL ASC', adminOrder: 'SORT_ORDER ASC, LABEL ASC',
});

import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { buildUpdateAssignments } from '../utils/sql-update-builder.js';
import { generateText } from './gemini.service.js';
import { translateTexts } from './translation.service.js';

const AVAILABLE_ROOM_STATUS = 'Disponible';
const SLIDE_SELECT = `
  SELECT slide.ID, slide.KIND, slide.REF_ID, slide.AI_TEXT, slide.AI_GENERATED_AT, slide.ADMIN_TEXT, slide.ADDITIVE,
         slide.ACTION_TYPE, slide.ACTION_LABEL, slide.ACTION_URL, slide.SORT_ORDER, slide.IS_PUBLISHED,
         slide.SHOWN_COUNT, slide.LAST_SHOWN_AT,
         COALESCE(room.NAME, activity.TITLE, slide.TITLE) AS TITLE,
         COALESCE(room.IMAGE_URL, activity.IMAGE_URL, slide.IMAGE_URL) AS IMAGE_URL,
         room.STATUS AS ROOM_STATUS, room.SPACE_TYPE, room.MAX_CAPACITY, room.EQUIPMENT, room.PRICING,
         room.DESCRIPTION AS ROOM_DESCRIPTION,
         activity.CATEGORY, activity.AGE_RANGE_LABEL, activity.SCHEDULE, activity.ENROLLMENT_CONDITIONS,
         activity.DESCRIPTION AS ACTIVITY_DESCRIPTION
  FROM PRESENTATION_SLIDES slide
  LEFT JOIN ROOMS room ON slide.KIND = 'room' AND room.ID = slide.REF_ID
  LEFT JOIN ACTIVITIES activity ON slide.KIND = 'activity' AND activity.ID = slide.REF_ID`;
const SLIDE_ORDER = 'ORDER BY slide.SORT_ORDER, COALESCE(room.NAME, activity.TITLE, slide.TITLE)';

/** Chaque salle et chaque formation a sa diapositive ; celles dont l'élément n'existe plus disparaissent. */
async function syncSlidesWithCatalog() {
  await query("DELETE FROM PRESENTATION_SLIDES WHERE KIND = 'room' AND REF_ID NOT IN (SELECT ID FROM ROOMS)");
  await query("DELETE FROM PRESENTATION_SLIDES WHERE KIND = 'activity' AND REF_ID NOT IN (SELECT ID FROM ACTIVITIES)");
  await query(`INSERT INTO PRESENTATION_SLIDES (KIND, REF_ID, ACTION_TYPE, SORT_ORDER)
               SELECT 'room', room.ID, 'reserve', 100 FROM ROOMS room
               WHERE NOT EXISTS (SELECT 1 FROM PRESENTATION_SLIDES slide WHERE slide.KIND = 'room' AND slide.REF_ID = room.ID)
               ON CONFLICT DO NOTHING`);
  await query(`INSERT INTO PRESENTATION_SLIDES (KIND, REF_ID, ACTION_TYPE, SORT_ORDER)
               SELECT 'activity', activity.ID, 'register', 200 FROM ACTIVITIES activity
               WHERE NOT EXISTS (SELECT 1 FROM PRESENTATION_SLIDES slide WHERE slide.KIND = 'activity' AND slide.REF_ID = activity.ID)
               ON CONFLICT DO NOTHING`);
}

/** Faits connus sur l'élément présenté : seule source autorisée pour le texte de Kim. */
function collectFacts(slide) {
  const equipment = Array.isArray(slide.equipment) ? slide.equipment.join(', ') : '';
  const facts = slide.kind === 'room' ? {
    nom: slide.title, type: slide.space_type, description: slide.room_description,
    capacite: slide.max_capacity ? `${slide.max_capacity} personnes` : null, equipements: equipment, tarif: slide.pricing,
  } : slide.kind === 'activity' ? {
    nom: slide.title, categorie: slide.category, description: slide.activity_description,
    public: slide.age_range_label, horaires: slide.schedule, conditions_inscription: slide.enrollment_conditions,
  } : { nom: slide.title };
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value));
}

/** Texte strictement factuel (secours si l'IA est indisponible, et aide à la relecture dans l'admin). */
function composeFactualText(slide) {
  const facts = collectFacts(slide);
  const sentences = [facts.type || facts.categorie ? `${facts.nom} — ${facts.type || facts.categorie}.` : `${facts.nom}.`];
  if (facts.description) sentences.push(facts.description);
  if (facts.capacite) sentences.push(`Capacité : ${facts.capacite}.`);
  if (facts.equipements) sentences.push(`Équipements : ${facts.equipements}.`);
  if (facts.public) sentences.push(`Public : ${facts.public}.`);
  if (facts.horaires) sentences.push(`Horaires : ${facts.horaires}.`);
  if (facts.tarif) sentences.push(`Tarif : ${facts.tarif}.`);
  if (facts.conditions_inscription) sentences.push(`Inscription : ${facts.conditions_inscription}.`);
  return sentences.join(' ').slice(0, 1900);
}

async function writeAiText(slide) {
  const facts = collectFacts(slide);
  let text = '';
  try {
    text = await generateText(
      `Tu es Kim, l'assistant du Centre Sportif, Culturel et des TIC Ivoiro-Coréen Alassane Ouattara. `
      + `Rédige en français une présentation concrète et précise (2 à 3 phrases, 60 mots maximum) de « ${slide.title} » pour un visiteur, `
      + `uniquement à partir des données ci-dessous. N'invente rien : aucune capacité, aucun équipement, tarif, horaire ou condition absent des données. `
      + `Réponds par le texte seul, sans titre ni guillemets.\nDonnées : ${JSON.stringify(facts)}`,
    );
  } catch (error) {
    console.error('[PRÉSENTATION] rédaction par Kim impossible :', error.message);
  }
  return (text || composeFactualText(slide)).slice(0, 1900);
}

async function ensureAiTexts(slides) {
  await Promise.all(slides.filter((slide) => !slide.ai_text).map(async (slide) => {
    slide.ai_text = await writeAiText(slide);
    slide.ai_generated_at = new Date().toISOString();
    await query('UPDATE PRESENTATION_SLIDES SET AI_TEXT = ?, AI_GENERATED_AT = NOW() WHERE ID = ?', [slide.ai_text, slide.id]);
  }));
}

/** Texte affiché : correction de l'administration (sinon texte de Kim) + complément. */
const finalTextOf = (slide) => [slide.admin_text || slide.ai_text, slide.additive].filter(Boolean).join(' ');

function resolveAction(slide) {
  const { action_type: type, action_label: label, action_url: url } = slide;
  if (type === 'none') return null;
  if (type === 'link') return url ? { type, label, url } : null;
  if (type === 'reserve') {
    const isBookable = slide.kind !== 'room' || slide.room_status === AVAILABLE_ROOM_STATUS;
    return isBookable ? { type, label, target: slide.kind === 'room' ? slide.ref_id : null } : { type: 'contact', label: null };
  }
  if (type === 'register') return { type, label, target: slide.kind === 'activity' ? slide.ref_id : null };
  return { type, label };
}

/** Diaporama présenté au visiteur (publié uniquement) ; compte chaque présentation pour l'administration. */
export async function listPresentation(language = 'fr') {
  await syncSlidesWithCatalog();
  const slides = await query(`${SLIDE_SELECT} WHERE slide.IS_PUBLISHED = TRUE ${SLIDE_ORDER}`);
  await ensureAiTexts(slides);
  const rawSlides = slides.map((slide) => ({
    id: slide.id, title: slide.title, image_url: slide.image_url, description: finalTextOf(slide), action: resolveAction(slide),
  }));
  // Titres, descriptions et libellés de boutons traduits d'un coup (cache en base : plus rien à retraduire ensuite).
  const texts = rawSlides.flatMap((slide) => [slide.title, slide.description, slide.action?.label || '']);
  const translated = await translateTexts(texts, language);
  const presentation = rawSlides.map((slide, position) => ({
    ...slide, title: translated[position * 3], description: translated[position * 3 + 1],
    action: slide.action && { ...slide.action, label: slide.action.label ? translated[position * 3 + 2] : slide.action.label },
  }));
  if (slides.length) await query('UPDATE PRESENTATION_SLIDES SET SHOWN_COUNT = SHOWN_COUNT + 1, LAST_SHOWN_AT = NOW() WHERE ID = ANY(?::text[])', [slides.map((slide) => slide.id)]);
  return presentation;
}

/** Présentations corrigées ou complétées par l'administration : elles font foi pour Kim. */
export async function listCorrectedPresentations() {
  const slides = await query(`${SLIDE_SELECT} WHERE slide.IS_PUBLISHED = TRUE AND (slide.ADMIN_TEXT IS NOT NULL OR slide.ADDITIVE IS NOT NULL) ${SLIDE_ORDER}`);
  return slides.map((slide) => ({ title: slide.title, text: finalTextOf(slide) }));
}

// ---------- Administration ----------
const toAdminView = (slide) => ({
  id: slide.id, kind: slide.kind, title: slide.title, image_url: slide.image_url,
  ai_text: slide.ai_text, ai_generated_at: slide.ai_generated_at, admin_text: slide.admin_text, additive: slide.additive,
  facts_text: slide.kind === 'custom' ? null : composeFactualText(slide), final_text: finalTextOf(slide),
  action_type: slide.action_type, action_label: slide.action_label, action_url: slide.action_url,
  sort_order: slide.sort_order, is_published: slide.is_published, shown_count: slide.shown_count, last_shown_at: slide.last_shown_at,
});

async function findSlide(slideId) {
  const [slide] = await query(`${SLIDE_SELECT} WHERE slide.ID = ?`, [slideId]);
  if (!slide) throw new AppError(404, 'Diapositive introuvable.');
  return slide;
}

export async function listSlidesForAdmin() {
  await syncSlidesWithCatalog();
  return (await query(`${SLIDE_SELECT} ${SLIDE_ORDER}`)).map(toAdminView);
}

const EDITABLE_COLUMNS = {
  admin_text: 'ADMIN_TEXT', additive: 'ADDITIVE', action_type: 'ACTION_TYPE', action_label: 'ACTION_LABEL',
  action_url: 'ACTION_URL', sort_order: 'SORT_ORDER', is_published: 'IS_PUBLISHED',
};
const CUSTOM_ONLY_COLUMNS = { title: 'TITLE', image_url: 'IMAGE_URL' };

export async function updateSlide(slideId, changes) {
  const slide = await findSlide(slideId);
  const columns = slide.kind === 'custom' ? { ...EDITABLE_COLUMNS, ...CUSTOM_ONLY_COLUMNS } : EDITABLE_COLUMNS;
  const { assignments, binds } = buildUpdateAssignments(columns, changes);
  if (!assignments.length) throw new AppError(400, 'Aucun champ à mettre à jour.');
  await query(`UPDATE PRESENTATION_SLIDES SET ${assignments.join(', ')}, UPDATED_AT = NOW() WHERE ID = ?`, [...binds, slideId]);
  return toAdminView(await findSlide(slideId));
}

export async function createCustomSlide(slideData) {
  const [created] = await query(
    `INSERT INTO PRESENTATION_SLIDES (KIND, TITLE, IMAGE_URL, ADMIN_TEXT, ADDITIVE, ACTION_TYPE, ACTION_LABEL, ACTION_URL, SORT_ORDER, IS_PUBLISHED)
     VALUES ('custom', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ID`,
    [
      slideData.title, slideData.image_url ?? null, slideData.admin_text ?? null, slideData.additive ?? null,
      slideData.action_type ?? 'contact', slideData.action_label ?? null, slideData.action_url ?? null,
      slideData.sort_order ?? 300, slideData.is_published ?? true,
    ],
  );
  return toAdminView(await findSlide(created.id));
}

export async function deleteSlide(slideId) {
  const slide = await findSlide(slideId);
  if (slide.kind !== 'custom') throw new AppError(400, 'Cette diapositive suit le catalogue : masquez-la (Publiée = non) ou supprimez la salle/formation.');
  await query('DELETE FROM PRESENTATION_SLIDES WHERE ID = ?', [slideId]);
  return { id: slideId, deleted: true };
}

/** Kim rédige à nouveau le texte à partir des données actuelles (la correction de l'administration reste prioritaire). */
export async function regenerateAiText(slideId) {
  const slide = await findSlide(slideId);
  if (slide.kind === 'custom') throw new AppError(400, 'Une diapositive personnalisée est rédigée par l\'administration.');
  slide.ai_text = await writeAiText(slide);
  await query('UPDATE PRESENTATION_SLIDES SET AI_TEXT = ?, AI_GENERATED_AT = NOW() WHERE ID = ?', [slide.ai_text, slideId]);
  return toAdminView(await findSlide(slideId));
}

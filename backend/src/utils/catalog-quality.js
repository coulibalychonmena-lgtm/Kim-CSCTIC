// Contrôle qualité du catalogue (salles et formations) : fonctions pures, testées dans tests/catalog-quality.test.js.
// Il traduit en liste d'actions les constats du rapport : fiches incomplètes, photos réutilisées, doublons, types incohérents.

const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '')
  .replace(/\b(le|la|les|l|un|une|des|de|du|d)\b/g, ' ').replace(/[^a-z0-9 ]+/g, ' ')
  .split(' ').filter(Boolean).map((word) => word.replace(/s$/, '')).sort().join(' ');
const isBlank = (value) => value === null || value === undefined || String(value).trim() === '' || (Array.isArray(value) && !value.length);

const ROOM_FIELDS = [['max_capacity', 'capacité'], ['surface_m2', 'surface'], ['equipment', 'équipements'], ['description', 'description'], ['pricing', 'tarif indicatif'], ['conditions', "conditions d'utilisation"], ['image_url', 'photo']];
const ACTIVITY_FIELDS = [['description', 'description'], ['age_range_label', 'public / âge'], ['schedule', 'jours et horaires'], ['duration', 'durée'], ['price', 'prix'], ['prerequisites', 'prérequis'], ['image_url', 'photo']];

export function analyzeCatalogQuality(rooms, activities) {
  const issues = [];
  const add = (severity, kind, subject, message) => issues.push({ severity, kind, subject, message });

  for (const room of rooms) {
    const missing = ROOM_FIELDS.filter(([field]) => isBlank(room[field])).map(([, label]) => label);
    if (missing.length) add('info', 'fiche_incomplete', `Salle « ${room.name} »`, `À compléter : ${missing.join(', ')}.`);
    if (isBlank(room.space_type)) add('warning', 'type_manquant', `Salle « ${room.name} »`, "Type d'espace manquant.");
  }
  for (const activity of activities) {
    const missing = ACTIVITY_FIELDS.filter(([field]) => isBlank(activity[field])).map(([, label]) => label);
    if (missing.length) add('info', 'fiche_incomplete', `Formation « ${activity.title} »`, `À compléter : ${missing.join(', ')}.`);
  }

  // Photos réutilisées : chaque espace (et chaque formation) devrait avoir sa propre photo.
  const byImage = new Map();
  for (const item of [...rooms.map((room) => ({ label: `Salle « ${room.name} »`, url: room.image_url })), ...activities.map((activity) => ({ label: `Formation « ${activity.title} »`, url: activity.image_url }))]) {
    if (!isBlank(item.url)) byImage.set(item.url, [...(byImage.get(item.url) || []), item.label]);
  }
  for (const labels of byImage.values()) {
    if (labels.length > 1) add('warning', 'photo_partagee', labels.join(' · '), 'Ces fiches utilisent la même photo : une photo propre à chaque espace est préférable.');
  }

  // Doublons probables : noms identiques une fois articles, accents, pluriels et ordre des mots neutralisés.
  const byName = new Map();
  for (const room of rooms) byName.set(normalize(room.name), [...(byName.get(normalize(room.name)) || []), room.name]);
  for (const names of byName.values()) {
    if (names.length > 1) add('warning', 'doublon_probable', names.map((name) => `« ${name} »`).join(' · '), 'Ces salles se ressemblent beaucoup : à regrouper si ce sont les mêmes espaces.');
  }

  // Types d'espace : lister les valeurs utilisées pour repérer les incohérences (ex. un parking classé « sport »).
  const typeCounts = new Map();
  for (const room of rooms) if (!isBlank(room.space_type)) typeCounts.set(room.space_type, (typeCounts.get(room.space_type) || 0) + 1);
  if (typeCounts.size) add('info', 'types_utilises', 'Types d\'espace', `Valeurs utilisées : ${[...typeCounts].map(([type, count]) => `${type} (${count})`).join(', ')}. Vérifiez que chaque espace est dans la bonne catégorie.`);

  // Texte incrusté dans une photo : non détectable automatiquement, rappel unique.
  if (rooms.some((room) => !isBlank(room.image_url))) add('info', 'texte_dans_les_photos', 'Photos des espaces', "Utilisez des photos sans texte ni capture d'écran : le nom de l'espace est déjà affiché par le site, et un texte incrusté double le titre et reste illisible sur mobile.");

  const rank = { warning: 0, info: 1 };
  return issues.sort((first, second) => rank[first.severity] - rank[second.severity]);
}

/** Clé de regroupement d'une question sans réponse (minuscules, sans accents ni ponctuation). */
export const questionKey = (question) => String(question || '').toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '')
  .replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);

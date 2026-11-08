// Emplacements d'images d'arrière-plan de la page d'accueil (modifiables depuis /admin, onglet « Images du site »).
export const SITE_BACKGROUND_SLOTS = [
  { id: 'hero', label: "Bandeau d'accueil", hint: 'Image derrière le titre et les boutons principaux (format paysage conseillé, 1600 px de large minimum).' },
  { id: 'services', label: 'Section « Faire une demande »', hint: 'Image derrière les trois cartes salle, formation et partenariat.' },
  { id: 'evenements', label: 'Bandeau « Parler à Kim »', hint: "Image derrière l'appel final vers le chat (format paysage conseillé)." },
];

/** Image fournie avec le site, utilisée tant que l'administration n'en a pas choisi une. */
export const defaultBackgroundUrl = (slot) => `/backgrounds/${slot}.webp`;

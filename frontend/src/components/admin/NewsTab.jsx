import { adminService } from '../../services/adminService.js';
import EntriesManager from './EntriesManager.jsx';

const FIELDS = [
  { name: 'title', label: "Titre de l'actualité", type: 'text', required: true },
  { name: 'summary', label: 'Résumé (affiché en aperçu)', type: 'text', assist: { imageField: 'image_url', kind: 'news' } },
  { name: 'content', label: 'Texte complet', type: 'textarea', required: true },
  { name: 'published_at', label: 'Date de publication (vide = maintenant)', type: 'datetime' },
  { name: 'image_url', label: "Image de l'actualité", type: 'image' },
  { name: 'is_published', label: 'Publiée sur le site, dans « Mon espace » et connue de Kim', type: 'checkbox' },
];

export default function NewsTab() {
  return (
    <EntriesManager
      title="Actualités du Centre" addLabel="Ajouter une actualité" dateField="published_at" fields={FIELDS} service={adminService.news}
      intro="Les actualités publiées s'affichent sur la page d'accueil et dans Mon espace ; Kim peut les résumer."
      emptyLabel="Aucune actualité. Utilisez « Ajouter une actualité »."
    />
  );
}

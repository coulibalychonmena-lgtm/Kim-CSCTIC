import { adminService } from '../../services/adminService.js';
import EntriesManager from './EntriesManager.jsx';

const FIELDS = [
  { name: 'title', label: "Titre de l'événement", type: 'text', required: true },
  { name: 'starts_at', label: 'Début (heure d\'Abidjan)', type: 'datetime', required: true },
  { name: 'ends_at', label: 'Fin (facultatif)', type: 'datetime' },
  { name: 'location', label: 'Lieu', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea', assist: { imageField: 'image_url', kind: 'event' } },
  { name: 'image_url', label: "Image de l'événement", type: 'image' },
  { name: 'is_published', label: 'Publié sur le site, dans « Mon espace » et connu de Kim', type: 'checkbox' },
];

export default function EventsTab() {
  return (
    <EntriesManager
      title="Événements du Centre" addLabel="Ajouter un événement" dateField="starts_at" fields={FIELDS} service={adminService.events}
      intro="Les événements à venir s'affichent sur la page d'accueil et dans Mon espace ; Kim peut les annoncer. Un événement terminé disparaît tout seul."
      emptyLabel="Aucun événement. Utilisez « Ajouter un événement »."
    />
  );
}

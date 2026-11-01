import { adminService } from '../../services/adminService.js';
import EntriesManager from './EntriesManager.jsx';

const FIELDS = [
  { name: 'title', label: 'Titre de la vidéo', type: 'text', required: true },
  { name: 'video_url', label: 'Lien de la vidéo (YouTube, Vimeo ou fichier .mp4 / Cloudinary)', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', assist: { videoField: 'video_url', kind: 'video' } },
  { name: 'sort_order', label: "Ordre d'affichage (petit nombre = en premier)", type: 'number' },
  { name: 'is_published', label: 'Publiée sur le site et proposée par Kim', type: 'checkbox' },
];

export default function VideosTab() {
  return (
    <EntriesManager
      title="Vidéos du Centre" addLabel="Ajouter une vidéo" fields={FIELDS} service={adminService.videos}
      describe={(entry) => entry.video_url}
      intro="Vidéos de présentation ou de récapitulatif pour la promotion du Centre. Collez le lien YouTube ou Vimeo (ou un fichier vidéo hébergé) : elles s'affichent sur l'accueil et Kim les montre dans le chat sur demande."
      emptyLabel="Aucune vidéo. Utilisez « Ajouter une vidéo »."
    />
  );
}

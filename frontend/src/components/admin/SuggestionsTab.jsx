import { adminService } from '../../services/adminService.js';
import EntriesManager from './EntriesManager.jsx';

const ACTIONS = [
  ['message', 'Envoyer une question à Kim'], ['presentation', 'Présenter les services (diaporama)'], ['videos', 'Montrer les vidéos'],
  ['form_room', 'Ouvrir le formulaire de réservation'], ['form_register', "Ouvrir le formulaire d'inscription"],
  ['form_partner', 'Ouvrir le formulaire de partenariat'], ['agent', 'Contacter un agent'],
];
const FIELDS = [
  { name: 'label', label: 'Texte du bouton (français)', type: 'text', required: true },
  { name: 'label_en', label: 'Texte en anglais (facultatif)', type: 'text' },
  { name: 'label_ko', label: 'Texte en coréen (facultatif)', type: 'text' },
  { name: 'action_type', label: 'Action du bouton', type: 'select', options: ACTIONS, required: true },
  { name: 'message', label: 'Question envoyée à Kim (facultatif : sinon le texte du bouton)', type: 'text' },
  { name: 'sort_order', label: "Ordre d'affichage (petit nombre = en premier)", type: 'number' },
  { name: 'is_published', label: 'Affichée à l\'ouverture du chat', type: 'checkbox' },
];

export default function SuggestionsTab() {
  return (
    <EntriesManager
      title="Suggestions du chat" addLabel="Ajouter une suggestion" fields={FIELDS} service={adminService.suggestions} titleField="label"
      describe={(entry) => `${ACTIONS.find(([value]) => value === entry.action_type)?.[1] || entry.action_type} · ordre ${entry.sort_order}`}
      intro="Boutons proposés par Kim quand quelqu'un ouvre le chat (« Que souhaitez-vous faire ? »). Chaque bouton peut poser une question, lancer la présentation des services, montrer les vidéos ou ouvrir un formulaire."
      emptyLabel="Aucune suggestion : le chat n'affichera pas de boutons."
    />
  );
}

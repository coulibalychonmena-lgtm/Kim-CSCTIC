const TONES = {
  'En attente de validation humaine': 'orange',
  "Liste d'attente": 'amber',
  Validée: 'green', Confirmée: 'green', Traité: 'green',
  Refusée: 'red', Archivé: 'grey',
  Nouveau: 'blue', "En cours d'étude": 'blue',
  Disponible: 'green', 'En maintenance': 'amber',
};

export default function StatusBadge({ status, label }) {
  return <span className={`badge badge--${TONES[status] || 'grey'}`}>{label || status}</span>;
}

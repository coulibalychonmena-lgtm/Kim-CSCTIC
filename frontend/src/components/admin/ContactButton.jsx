/** Bouton « Contacter » : ouvre le client e-mail de l'agent, objet prérempli. */
export default function ContactButton({ email, subject, label = 'Contacter' }) {
  return (
    <a className="btn btn--small btn--soft" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>{label}</a>
  );
}

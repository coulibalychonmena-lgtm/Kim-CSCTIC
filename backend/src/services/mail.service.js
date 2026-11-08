import { env } from '../config/environment.js';

/**
 * Envoi d'e-mails via l'API HTTP de Resend (aucune dépendance). Sans MAIL_API_KEY / MAIL_FROM, rien ne part :
 * le lien est écrit dans les journaux du serveur (utile en développement) et l'appelant en est informé.
 */
export async function sendMail({ to, subject, text, html }) {
  if (!env.mail.apiKey || !env.mail.from) {
    console.warn(`[MAIL] non configuré (MAIL_API_KEY / MAIL_FROM) : e-mail « ${subject} » pour ${to} NON envoyé.\n${text}`);
    return { sent: false };
  }
  const httpResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.mail.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.mail.from, to: [to], subject, text, html }),
  });
  if (!httpResponse.ok) throw new Error(`Envoi d'e-mail refusé (HTTP ${httpResponse.status}).`);
  return { sent: true };
}

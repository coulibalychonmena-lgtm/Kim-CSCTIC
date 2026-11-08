import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';

const CSV_HEADER = 'question;langue;occurrences;statut;derniere_fois';
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Base de connaissances : questions auxquelles Kim n'a pas su répondre (à compléter chaque semaine) et contrôle qualité du catalogue. */
export default function KnowledgeGapsTab() {
  const { token } = useAuth();
  const [showDone, setShowDone] = useState(false);
  const questions = useAutoRefreshingData(() => adminService.listUnansweredQuestions(token, showDone ? undefined : 'À compléter'), [token, showDone]);
  const quality = useAutoRefreshingData(() => adminService.getCatalogQuality(token), [token]);
  const [error, setError] = useState('');

  const markDone = async (question) => {
    try { await adminService.updateUnansweredQuestion(token, question.id, 'Traité'); await questions.reload(); } catch (failure) { setError(failure.message); }
  };
  const exportCsv = () => {
    const lines = (questions.data || []).map((q) => [q.question, q.language, q.occurrences, q.status, q.last_seen].map(csvCell).join(';'));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${[CSV_HEADER, ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    link.download = 'questions-sans-reponse.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div>
      <h2>Questions sans réponse</h2>
      <p className="muted">Quand Kim répond « non renseigné », la question est notée ici (les doublons sont regroupés et comptés). Complétez la fiche concernée (salle, formation, informations), puis marquez la question comme traitée : elle réapparaît si elle est reposée.</p>
      <div className="cta-row">
        <label className="check"><input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} /> Afficher aussi les questions traitées</label>
        <button type="button" className="btn btn--soft btn--small" onClick={exportCsv} disabled={!questions.data?.length}>Exporter en CSV</button>
      </div>
      {(error || questions.error) && <p className="form-error" role="alert">{error || questions.error}</p>}
      {questions.loading && <p className="muted">Chargement…</p>}
      {questions.data && questions.data.length === 0 && <p className="muted">Aucune question en attente : bravo.</p>}
      {questions.data?.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Question</th><th>Langue</th><th>Fois</th><th>Dernière fois</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {questions.data.map((question) => (
                <tr key={question.id}>
                  <td>{question.question}</td><td>{question.language}</td><td>{question.occurrences}</td>
                  <td>{new Date(question.last_seen).toLocaleDateString('fr-FR')}</td><td>{question.status}</td>
                  <td>{question.status !== 'Traité' && <button type="button" className="btn btn--small btn--soft" onClick={() => markDone(question)}>Marquer traité</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Contrôle qualité du catalogue</h2>
      <p className="muted">Fiches incomplètes, photos réutilisées, doublons probables : les points à corriger pour que les cartes du site et les réponses de Kim soient homogènes.</p>
      {quality.loading && <p className="muted">Analyse…</p>}
      {quality.data && quality.data.length === 0 && <p className="muted">Aucun point à corriger.</p>}
      <ul className="quality-list">
        {(quality.data || []).map((issue, position) => (
          <li key={`${issue.kind}-${position}`} className={`quality-list__item quality-list__item--${issue.severity}`}>
            <strong>{issue.subject}</strong> — {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** Suggestions cliquables affichées à l'ouverture du chat (gérées dans l'administration). */
export default function SuggestionChips({ exclude = [] }) {
  const { lang } = useLanguage();
  const { suggestions, hasVideos, runSuggestion, typing } = useChat();
  const visibleSuggestions = suggestions.filter((suggestion) => !exclude.includes(suggestion.action_type) && (suggestion.action_type !== 'videos' || hasVideos));
  if (!visibleSuggestions.length) return null;
  return (
    <div className="chips" role="group">
      {visibleSuggestions.map((suggestion) => (
        <button key={suggestion.id} type="button" className="chip" disabled={typing} onClick={() => runSuggestion(suggestion)}>
          {(lang === 'en' && suggestion.label_en) || (lang === 'ko' && suggestion.label_ko) || suggestion.label}
        </button>
      ))}
    </div>
  );
}

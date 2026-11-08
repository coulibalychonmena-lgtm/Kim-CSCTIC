import { parseInline, parseMarkdown } from '../utils/markdown.js';

function Inline({ text }) {
  return parseInline(text).map((segment, position) => {
    switch (segment.type) {
      case 'strong': return <strong key={position}>{segment.text}</strong>;
      case 'em': return <em key={position}>{segment.text}</em>;
      case 'code': return <code key={position}>{segment.text}</code>;
      case 'link': return <a key={position} href={segment.href} target="_blank" rel="noopener noreferrer">{segment.text}</a>;
      default: return segment.text;
    }
  });
}

/** Réponse de Kim mise en forme (listes, gras, liens). Aucun HTML brut interprété : voir utils/markdown.js. */
export default function Markdown({ text }) {
  return parseMarkdown(text).map((block, position) => {
    if (block.type === 'ul') return <ul key={position} className="md-list">{block.items.map((item, index) => <li key={index}><Inline text={item} /></li>)}</ul>;
    if (block.type === 'ol') return <ol key={position} className="md-list">{block.items.map((item, index) => <li key={index}><Inline text={item} /></li>)}</ol>;
    return <p key={position} className="md-paragraph">{block.lines.map((line, index) => <span key={index}>{index > 0 && <br />}<Inline text={line} /></span>)}</p>;
  });
}

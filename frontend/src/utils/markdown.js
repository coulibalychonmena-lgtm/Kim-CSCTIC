/**
 * Mini-rendu Markdown sûr pour les réponses de Kim (fonctions pures, testées) : paragraphes, listes à puces et numérotées,
 * **gras**, *italique*, `code`, liens [texte](https://…). AUCUN HTML brut n'est jamais interprété : le résultat est un arbre
 * de blocs/segments que Markdown.jsx transforme en éléments React (pas de dangerouslySetInnerHTML), donc pas d'injection possible.
 */
const SAFE_LINK = /^https?:\/\/[^\s<>"']+$/i;
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

/** Découpe une ligne en segments { type: 'text' | 'strong' | 'em' | 'code' | 'link', text, href? }. */
export function parseInline(text) {
  const segments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > lastIndex) segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    const token = match[0];
    if (token.startsWith('**')) segments.push({ type: 'strong', text: token.slice(2, -2) });
    else if (token.startsWith('`')) segments.push({ type: 'code', text: token.slice(1, -1) });
    else if (token.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      segments.push(SAFE_LINK.test(href) ? { type: 'link', text: label, href } : { type: 'text', text: token }); // javascript:, data: … restent du texte
    } else segments.push({ type: 'em', text: token.slice(1, -1) });
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) segments.push({ type: 'text', text: text.slice(lastIndex) });
  return segments;
}

/** Blocs : { type: 'paragraph', lines } | { type: 'ul' | 'ol', items }. Une ligne « -Du lundi… » (sans espace) est aussi une puce. */
export function parseMarkdown(source) {
  const blocks = [];
  let current = null;
  const flush = () => { if (current) { blocks.push(current); current = null; } };
  for (const rawLine of String(source || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trimEnd();
    const bullet = /^\s*[-*•]\s*(\S.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(\S.*)$/.exec(line);
    if (!line.trim()) { flush(); continue; }
    if (bullet && !/^\s*\*\*/.test(line)) {
      if (current?.type !== 'ul') { flush(); current = { type: 'ul', items: [] }; }
      current.items.push(bullet[1]);
    } else if (numbered) {
      if (current?.type !== 'ol') { flush(); current = { type: 'ol', items: [] }; }
      current.items.push(numbered[1]);
    } else {
      if (current?.type !== 'paragraph') { flush(); current = { type: 'paragraph', lines: [] }; }
      current.lines.push(line.trim());
    }
  }
  flush();
  return blocks;
}

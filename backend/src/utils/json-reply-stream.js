/**
 * Extrait au fil de l'eau le champ "reply" d'un JSON produit en flux par le modèle, pour afficher la réponse
 * progressivement (SSE) alors que le JSON complet n'est connu qu'à la fin. Fonction pure, testée.
 *
 * Usage : const extractor = createReplyExtractor(); extractor.push(morceau) → texte NOUVEAU de la réponse (ou '').
 * Le prompt de Kim place « reply » en premier dans l'objet JSON ; on gère les échappements (\n, \", \uXXXX) même coupés entre deux morceaux.
 */
export function createReplyExtractor() {
  let buffer = '';
  let position = -1;       // index du premier caractère de la valeur de "reply" dans buffer (-1 = pas encore trouvé)
  let emitted = 0;         // nombre de caractères de buffer déjà traités à partir de `position`
  let finished = false;
  const ESCAPES = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };

  return {
    push(chunk) {
      if (finished) return '';
      buffer += chunk;
      if (position === -1) {
        const match = /"reply"\s*:\s*"/.exec(buffer);
        if (!match) return '';
        position = match.index + match[0].length;
      }
      let output = '';
      let index = position + emitted;
      while (index < buffer.length) {
        const character = buffer[index];
        if (character === '"') { finished = true; break; }
        if (character === '\\') {
          if (index + 1 >= buffer.length) break;                    // échappement coupé : on attend la suite
          const next = buffer[index + 1];
          if (next === 'u') {
            if (index + 6 > buffer.length) break;                   // \uXXXX incomplet
            output += String.fromCharCode(parseInt(buffer.slice(index + 2, index + 6), 16));
            index += 6;
          } else { output += ESCAPES[next] ?? next; index += 2; }
        } else { output += character; index += 1; }
      }
      emitted = index - position;
      return output;
    },
    get done() { return finished; },
  };
}

/**
 * Lecture d'un flux Server-Sent Events (fonction pure, testée). `push(texte)` renvoie les événements complets
 * reçus [{ event, data }] ; un événement coupé entre deux morceaux est gardé en attente.
 */
export function createSseParser() {
  let buffer = '';
  return {
    push(chunk) {
      buffer += chunk.replace(/\r\n/g, '\n');
      const events = [];
      let separator;
      while ((separator = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        let event = 'message';
        const dataLines = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        if (dataLines.length) {
          try { events.push({ event, data: JSON.parse(dataLines.join('\n')) }); } catch { /* bloc illisible : ignoré */ }
        }
      }
      return events;
    },
  };
}

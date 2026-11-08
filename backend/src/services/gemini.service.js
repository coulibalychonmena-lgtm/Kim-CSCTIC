import { gemini, GEMINI_MODEL } from '../config/gemini.js';
import { createReplyExtractor } from '../utils/json-reply-stream.js';

const toGeminiContents = (history, message) => [
  ...history.flatMap((exchange) => [
    { role: 'user', parts: [{ text: exchange.user_message }] },
    ...(exchange.kim_response ? [{ role: 'model', parts: [{ text: exchange.kim_response }] }] : []),
  ]),
  { role: 'user', parts: [{ text: message }] },
];

function parseKimTurn(rawText) {
  const text = String(rawText || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try { return JSON.parse(text); } catch { return { reply: text, sources: [], needs_human: false, images: [], form: null, present_services: false, show_videos: false }; }
}

/**
 * Un tour de conversation de Kim : renvoie l'objet JSON structuré.
 * Avec `onReplyDelta`, la réponse est générée en flux et le texte du champ « reply » est transmis au fur et à mesure
 * (affichage progressif) ; l'objet complet n'est analysé qu'à la fin.
 */
export async function generateKimTurn({ systemInstruction, history, message, onReplyDelta }) {
  const config = { systemInstruction, temperature: 0.3, responseMimeType: 'application/json' };
  if (onReplyDelta) {
    const extractor = createReplyExtractor();
    let fullText = '';
    const stream = await gemini.models.generateContentStream({ model: GEMINI_MODEL, contents: toGeminiContents(history, message), config });
    for await (const chunk of stream) {
      const piece = chunk.text || '';
      fullText += piece;
      const delta = extractor.push(piece);
      if (delta) onReplyDelta(delta);
    }
    return parseKimTurn(fullText);
  }
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: toGeminiContents(history, message),
    config,
  });
  return parseKimTurn(response.text);
}

/** Texte libre (ex. expliquer poliment une erreur de validation). */
export async function generateText(prompt) {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  });
  return String(response.text || '').trim();
}

/** Décrit une image (octets en base64) : Gemini regarde réellement l'image. */
export async function describeImage(prompt, mimeType, base64Data) {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
    config: { temperature: 0.2 },
  });
  return String(response.text || '').trim();
}

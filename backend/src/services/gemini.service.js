import { gemini, GEMINI_MODEL } from '../config/gemini.js';

const toGeminiContents = (history, message) => [
  ...history.flatMap((exchange) => [
    { role: 'user', parts: [{ text: exchange.user_message }] },
    ...(exchange.kim_response ? [{ role: 'model', parts: [{ text: exchange.kim_response }] }] : []),
  ]),
  { role: 'user', parts: [{ text: message }] },
];

function parseKimTurn(rawText) {
  const text = String(rawText || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try { return JSON.parse(text); } catch { return { reply: text, sources: [], needs_human: false, images: [], form: null }; }
}

/** Un tour de conversation de Kim : renvoie l'objet JSON structuré. */
export async function generateKimTurn({ systemInstruction, history, message }) {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: toGeminiContents(history, message),
    config: { systemInstruction, temperature: 0.3, responseMimeType: 'application/json' },
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

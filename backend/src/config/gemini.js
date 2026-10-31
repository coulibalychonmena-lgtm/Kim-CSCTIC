import { GoogleGenAI } from '@google/genai';
import { env } from './environment.js';

export const gemini = new GoogleGenAI({ apiKey: env.gemini.apiKey });
export const GEMINI_MODEL = env.gemini.model;

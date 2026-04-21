// src/lib/openaiClient.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper around the official OpenAI SDK.
// Returns a shared OpenAI instance.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from 'openai';
import logger from './logger.mjs';

let _client = null;

export function getOpenAIClient() {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY is missing or invalid in .env');
  }

  _client = new OpenAI({ apiKey });
  logger.debug('✅ OpenAI client initialized');
  return _client;
}

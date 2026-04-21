// src/lib/nimTextClient.mjs
// ─────────────────────────────────────────────────────────────────────────────
// NVIDIA NIM — Text Generation Client (OpenAI-compatible API)
//
// NVIDIA NIM exposes an OpenAI-compatible /chat/completions endpoint.
// We reuse the official `openai` npm package — just swap the baseURL.
// This means ONE NVIDIA_API_KEY covers both text (this) and images (FLUX).
//
// Default model: meta/llama-3.3-70b-instruct
// Override via NIM_TEXT_MODEL in .env
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from 'openai';
import logger from './logger.mjs';

let _client = null;

export const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export function getNIMTextClient() {
  if (_client) return _client;

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || !apiKey.startsWith('nvapi-')) {
    throw new Error('NVIDIA_API_KEY is missing or invalid in .env (should start with "nvapi-")');
  }

  _client = new OpenAI({
    apiKey,
    baseURL: NVIDIA_NIM_BASE_URL,
  });

  const model = process.env.NIM_TEXT_MODEL || 'meta/llama-3.3-70b-instruct';
  logger.debug({ model, baseURL: NVIDIA_NIM_BASE_URL }, '✅ NVIDIA NIM text client initialized');
  return _client;
}

/** Returns the configured text model name */
export function getNIMTextModel() {
  return process.env.NIM_TEXT_MODEL || 'meta/llama-3.3-70b-instruct';
}

// src/steps/03_generateImage.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 3: NVIDIA NIM — FLUX.1-schnell Image Generation
//   INPUT:  imagePrompt (string)
//   OUTPUT: imageBuffer (Buffer of PNG/JPEG bytes)
//
// NVIDIA NIM FLUX.1-schnell returns the image as base64 in the JSON response.
// Correct endpoint: https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell
// ─────────────────────────────────────────────────────────────────────────────

import logger from '../lib/logger.mjs';

const NVIDIA_API_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell';

export async function generateImage(imagePrompt) {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 3 ▶  NVIDIA NIM: FLUX.1-schnell Image Generation');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || !apiKey.startsWith('nvapi-')) {
    throw new Error('NVIDIA_API_KEY is missing or invalid in .env (should start with "nvapi-")');
  }

  logger.info({ prompt: imagePrompt.substring(0, 120) + '...' }, '🎨 Sending image prompt to NVIDIA NIM FLUX.1-schnell...');

  const requestBody = {
    prompt: imagePrompt,
    width: 1024,
    height: 1024,
    seed: 0,
    steps: 4,          // FLUX.1-schnell is a distilled 4-step model
    cfg_scale: 0,      // Must be ≤ 0 for schnell (no CFG guidance)
  };

  logger.debug({ requestBody, endpoint: NVIDIA_API_URL }, '📤 Request details');

  const t0 = Date.now();

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const elapsed = Date.now() - t0;
  logger.debug({ status: response.status, elapsedMs: elapsed }, `📥 NVIDIA NIM responded in ${elapsed}ms`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `NVIDIA NIM request failed [HTTP ${response.status}]:\n${errorText}\n` +
      `Endpoint: ${NVIDIA_API_URL}`
    );
  }

  const data = await response.json();

  logger.debug({
    responseKeys: Object.keys(data),
    artifactsCount: data.artifacts?.length,
  }, '📦 NVIDIA NIM response structure');

  // NVIDIA NIM FLUX response: { artifacts: [{ base64: "...", seed: N, finish_reason: "SUCCESS" }] }
  const base64Image = data?.artifacts?.[0]?.base64;

  if (!base64Image) {
    logger.error({ fullResponse: JSON.stringify(data).substring(0, 500) }, '❌ Unexpected NVIDIA NIM response format');
    throw new Error(
      `NVIDIA NIM response missing 'artifacts[0].base64'.\n` +
      `Full response (truncated): ${JSON.stringify(data).substring(0, 500)}`
    );
  }

  const imageBuffer = Buffer.from(base64Image, 'base64');
  logger.info({
    elapsedMs: elapsed,
    imageSizeKB: Math.round(imageBuffer.length / 1024),
    seed: data?.artifacts?.[0]?.seed,
    finishReason: data?.artifacts?.[0]?.finish_reason,
  }, `✅ STEP 3 COMPLETE — Image generated (${Math.round(imageBuffer.length / 1024)} KB)`);

  return imageBuffer;
}

// src/steps/04_createTitleBullets.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 4: GPT-4o Call #2
//   INPUT:  polishedPost text
//   OUTPUT: { postTitle, bullet1, bullet2, bullet3 }
//
// Generates a punchy image overlay title and 3 key takeaway bullets
// to be burned into the branded image by the sharp compositor.
// ─────────────────────────────────────────────────────────────────────────────

import { getNIMTextClient, getNIMTextModel } from '../lib/nimTextClient.mjs';
import logger from '../lib/logger.mjs';

const SYSTEM_PROMPT = `You are a LinkedIn content designer. 
Given a LinkedIn post, extract:
1. A short, punchy TITLE (max 8 words) to display on the image — make it a bold statement or insight
2. Exactly 3 KEY BULLETS — concise takeaways from the post (max 12 words each, start each with an emoji)

Respond ONLY with valid JSON:
{
  "postTitle": "Bold Insight Title Here",
  "bullet1": "🔑 First key takeaway from the post",
  "bullet2": "📈 Second key takeaway from the post",
  "bullet3": "💡 Third key takeaway from the post"
}`;

export async function createTitleAndBullets(polishedPost) {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 4 ▶  NVIDIA NIM: Create Image Title + 3 Bullet Points');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const nim = getNIMTextClient();
  const model = getNIMTextModel();

  logger.info({ model }, `🤖 Sending to NVIDIA NIM ${model} (title + bullets)...`);
  const t0 = Date.now();

  const response = await nim.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Generate title and bullets for this LinkedIn post:\n\n${polishedPost}` },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const elapsed = Date.now() - t0;
  const rawContent = response.choices[0].message.content;

  logger.debug({
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    elapsedMs: elapsed,
  }, `⏱️  NVIDIA NIM responded in ${elapsed}ms`);

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    throw new Error(`GPT-4o (step 4) did not return valid JSON:\n${rawContent}`);
  }

  const { postTitle, bullet1, bullet2, bullet3 } = parsed;

  if (!postTitle || !bullet1 || !bullet2 || !bullet3) {
    throw new Error(`GPT-4o (step 4) response missing required fields:\n${rawContent}`);
  }

  logger.info(`✅ STEP 4 COMPLETE`);
  logger.info({ postTitle }, `📌 Title`);
  logger.info({ bullet1, bullet2, bullet3 }, `📋 Bullets`);

  return { postTitle, bullet1, bullet2, bullet3 };
}

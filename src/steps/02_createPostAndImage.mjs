// src/steps/02_createPostAndImage.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 2: GPT-4o Call #1
//   INPUT:  raw draft post text
//   OUTPUT: { polishedPost, imagePrompt }
//
// GPT-4o polishes the LinkedIn post to be punchy & professional,
// and also generates a FLUX image prompt based on the post's theme.
// ─────────────────────────────────────────────────────────────────────────────

import { getNIMTextClient, getNIMTextModel } from '../lib/nimTextClient.mjs';
import logger from '../lib/logger.mjs';

const SYSTEM_PROMPT = `You are a senior LinkedIn content strategist and copywriter specializing in FinTech, AI Automation, and Career Growth. 
Your task is to:
1. Polish the given LinkedIn draft into a high-engagement post.
2. Generate a cinematic, photorealistic FLUX image prompt.

CRITICAL FORMATTING for "polishedPost":
- LINE 1: Must be a powerful, attention-grabbing hook.
- SPACING: Leave exactly one blank line after the hook.
- PARAGRAPHS: Every paragraph should be exactly 2 sentences long, followed by a blank line. This creates a "breathable" and readable LinkedIn layout.
- HASHTAGS: End the post with a diverse set of 5-8 relevant hashtags (e.g., #FinTech #AI #Automation #PersonalBranding #CareerGrowth #DataAnalytics #Productivity).

IMPORTANT for output format:
- Respond ONLY with a single, flat JSON object.
- NO markdown formatting (no \`\`\`json blocks).
- Ensure all double quotes inside the string values are properly escaped with a backslash (\\").
- If there is a human subject in the image prompt, they MUST always be a young professional woman (South Asian appearance, dark hair). Describe her naturally as "a young professional woman" in context.

Respond in this exact JSON format:
{
  "polishedPost": "the improved LinkedIn post text",
  "imagePrompt": "detailed text-to-image prompt for FLUX"
}`;

export async function createPostAndImagePrompt(rawPostText) {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 2 ▶  NVIDIA NIM: Polish Post + Generate Image Prompt');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.debug({ charCount: rawPostText.length }, '📄 Raw post text received');

  const nim = getNIMTextClient();
  const model = getNIMTextModel();

  logger.info({ model }, `🤖 Sending to NVIDIA NIM ${model} (post polish + image prompt)...`);
  const t0 = Date.now();

  const response = await nim.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Here is the LinkedIn draft to polish:\n\n${rawPostText}` },
    ],
    temperature: 0.7, // Lower temperature for more consistent JSON
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const elapsed = Date.now() - t0;
  let rawContent = response.choices[0].message.content;

  logger.debug({
    model: response.model,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    elapsedMs: elapsed,
  }, `⏱️  NVIDIA NIM responded in ${elapsed}ms`);

  // Robust cleaning: remove markdown code blocks if the model included them
  rawContent = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    logger.error({ rawContent, error: e.message }, '❌ Failed to parse JSON from NVIDIA NIM');
    throw new Error(`NVIDIA NIM did not return valid JSON. Raw output: ${rawContent.substring(0, 500)}...`);
  }

  const { polishedPost, imagePrompt } = parsed;

  if (!polishedPost || !imagePrompt) {
    throw new Error(`NVIDIA NIM response missing required fields. Raw output: ${rawContent}`);
  }

  logger.info(`✅ STEP 2 COMPLETE`);
  logger.info({ charCount: polishedPost.length }, `📝 Polished post (${polishedPost.length} chars)`);
  logger.info({ imagePrompt }, `🎨 Image prompt`);

  return { polishedPost, imagePrompt };
}

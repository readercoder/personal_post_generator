// src/pipeline.mjs
// ─────────────────────────────────────────────────────────────────────────────
// MAIN PIPELINE ORCHESTRATOR
// Runs the full end-to-end flow with detailed logging.
// Can be triggered directly:  node src/pipeline.mjs
// Or called by the cron scheduler in index.mjs
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import logger from './lib/logger.mjs';

import { fetchNextPost }           from './steps/01_fetchNextPost.mjs';
import { createPostAndImagePrompt } from './steps/02_createPostAndImage.mjs';
import { generateImage }           from './steps/03_generateImage.mjs';
import { createTitleAndBullets }   from './steps/04_createTitleBullets.mjs';
import { brandImage }              from './steps/05_brandImage.mjs';
import { publishToLinkedIn }       from './steps/06_publishLinkedIn.mjs';
import { markPosted }              from './steps/07_markPosted.mjs';

export async function runPipeline() {
  const runId = `run_${Date.now()}`;
  const startTime = Date.now();

  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════════════╗');
  logger.info('║       LINKEDIN POST AUTOMATION PIPELINE — STARTED           ║');
  logger.info('╚══════════════════════════════════════════════════════════════╝');
  logger.info({ runId, dryRun: process.env.DRY_RUN === 'true', time: new Date().toISOString() }, '🚀 Pipeline initiated');

  try {
    // ── STEP 1: Fetch next unposted draft from Google Sheets ──────────────────
    const post = await fetchNextPost();
    if (!post) {
      logger.info('🏁 Pipeline complete — no unposted rows found. Nothing to publish.');
      return { success: true, skipped: true };
    }

    const { postText, postNumber, rowIndex } = post;

    // ── STEP 2: GPT-4o — Polish post + generate image prompt ─────────────────
    const { polishedPost, imagePrompt } = await createPostAndImagePrompt(postText);

    // ── STEP 3: NVIDIA NIM — Generate FLUX.2-klein-4b image ───────────────────
    const rawImageBuffer = await generateImage(imagePrompt);

    // ── STEP 4: GPT-4o — Generate image overlay title + bullets ──────────────
    const { postTitle, bullet1, bullet2, bullet3 } = await createTitleAndBullets(polishedPost);

    // ── STEP 5: Brand compositor — Apply text overlay to image ────────────────
    const brandedJpegBuffer = await brandImage(
      rawImageBuffer,
      postTitle,
      bullet1,
      bullet2,
      bullet3,
      postNumber
    );

    // ── STEP 6: LinkedIn — Publish post + image ───────────────────────────────
    const { personalPostUrn, orgPostUrn } = await publishToLinkedIn(polishedPost, brandedJpegBuffer);

    // ── STEP 7: Google Sheets — Mark row as Posted = Yes ─────────────────────
    await markPosted(rowIndex);

    // ── DONE ──────────────────────────────────────────────────────────────────
    const totalMs = Date.now() - startTime;
    logger.info('');
    logger.info('╔══════════════════════════════════════════════════════════════╗');
    logger.info('║       PIPELINE COMPLETE ✅                                  ║');
    logger.info('╚══════════════════════════════════════════════════════════════╝');
    logger.info({
      runId,
      postNumber,
      rowIndex,
      personalPostUrn,
      orgPostUrn: orgPostUrn || '(not posted)',
      totalSeconds: (totalMs / 1000).toFixed(1),
      dryRun: process.env.DRY_RUN === 'true',
    }, `🎉 Post #${postNumber} processed successfully in ${(totalMs / 1000).toFixed(1)}s`);

    return { success: true, postNumber, personalPostUrn, orgPostUrn };

  } catch (err) {
    const totalMs = Date.now() - startTime;
    logger.error('');
    logger.error('╔══════════════════════════════════════════════════════════════╗');
    logger.error('║       PIPELINE FAILED ❌                                    ║');
    logger.error('╚══════════════════════════════════════════════════════════════╝');
    logger.error({
      runId,
      error: err.message,
      stack: err.stack,
      totalSeconds: (totalMs / 1000).toFixed(1),
    }, `💥 Pipeline failed after ${(totalMs / 1000).toFixed(1)}s`);

    return { success: false, error: err.message };
  }
}

// ── Allow direct execution: node src/pipeline.mjs ────────────────────────────
const isMain = process.argv[1]?.endsWith('pipeline.mjs');
if (isMain) {
  runPipeline().then(result => {
    if (!result.success && !result.skipped) process.exit(1);
  });
}

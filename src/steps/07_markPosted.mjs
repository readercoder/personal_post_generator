// src/steps/07_markPosted.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 7: Mark the post as "Posted = Yes" in Google Sheets.
// Skipped in DRY_RUN mode.
// ─────────────────────────────────────────────────────────────────────────────

import { markRowAsPosted } from '../lib/googleSheets.mjs';
import logger from '../lib/logger.mjs';

export async function markPosted(rowIndex) {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 7 ▶  Mark Post as Published in Google Sheets');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dryRun = process.env.DRY_RUN === 'true';

  if (dryRun) {
    logger.warn({ rowIndex }, `🟡 DRY_RUN=true — Would mark row ${rowIndex} as Posted = Yes (skipped)`);
    return;
  }

  await markRowAsPosted(rowIndex);
  logger.info({ rowIndex }, `✅ STEP 7 COMPLETE — Row ${rowIndex} set to "Posted = Yes"`);
}

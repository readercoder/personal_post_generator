// src/steps/01_fetchNextPost.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Read Google Sheet and pick the NEXT unposted draft.
// Picks the row with the lowest Post_Number (or first unposted if no numbers).
// ─────────────────────────────────────────────────────────────────────────────

import { getUnpostedRows } from '../lib/googleSheets.mjs';
import logger from '../lib/logger.mjs';

export async function fetchNextPost() {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 1 ▶  Fetch Next Post from Google Sheets');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const unposted = await getUnpostedRows();

  if (unposted.length === 0) {
    logger.warn('⚠️  No unposted rows found in the sheet. Nothing to do.');
    return null;
  }

  logger.info({ count: unposted.length }, `📬 Found ${unposted.length} unposted draft(s)`);

  // Sort by postNumber ascending; treat non-numeric as Infinity (place at end)
  const sorted = [...unposted].sort((a, b) => {
    const na = isNaN(Number(a.postNumber)) ? Infinity : Number(a.postNumber);
    const nb = isNaN(Number(b.postNumber)) ? Infinity : Number(b.postNumber);
    return na - nb;
  });

  const next = sorted[0];

  logger.info({
    postNumber: next.postNumber,
    rowIndex: next.rowIndex,
    textPreview: next.postText.substring(0, 120) + (next.postText.length > 120 ? '...' : ''),
  }, `✅ STEP 1 COMPLETE — Selected post #${next.postNumber} (sheet row ${next.rowIndex})`);

  return next;
}

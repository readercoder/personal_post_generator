// src/steps/06_publishLinkedIn.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 6: Publish to LinkedIn
//   INPUT:  polishedPost, brandedJpegBuffer
//   OUTPUT: { personalPostUrn, orgPostUrn }
//
// Posts to BOTH personal profile AND org company page (in parallel).
// Skips org post if LINKEDIN_ORG_URN is not set.
// In DRY_RUN mode: logs everything but does NOT actually post.
// ─────────────────────────────────────────────────────────────────────────────

import { uploadImage, createPost } from '../lib/linkedinClient.mjs';
import logger from '../lib/logger.mjs';

export async function publishToLinkedIn(polishedPost, brandedJpegBuffer) {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 6 ▶  Publish Post to LinkedIn');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dryRun    = process.env.DRY_RUN === 'true';
  const personId  = process.env.LINKEDIN_PERSON_URN;
  const orgId     = process.env.LINKEDIN_ORG_URN;

  if (!personId || personId === 'your_person_id_here') {
    throw new Error('LINKEDIN_PERSON_URN is not set in .env');
  }

  const personUrn = personId.startsWith('urn:li:') ? personId : `urn:li:person:${personId}`;
  const orgUrn    = orgId && orgId !== 'your_org_id_here'
    ? (orgId.startsWith('urn:li:') ? orgId : `urn:li:organization:${orgId}`)
    : null;

  logger.info({ personUrn, orgUrn: orgUrn || '(not set — personal only)', dryRun }, '🔗 LinkedIn publish config');
  logger.info({ textPreview: polishedPost.substring(0, 150) + '...', imageSizeKB: Math.round(brandedJpegBuffer.length / 1024) }, '📤 Post content summary');

  if (dryRun) {
    logger.warn('🟡 DRY_RUN=true — Skipping actual LinkedIn API calls. Everything else ran normally.');
    return { personalPostUrn: 'DRY_RUN', orgPostUrn: orgUrn ? 'DRY_RUN' : null };
  }

  // --- PERSONAL POST ---
  logger.info('👤 Uploading image for personal post...');
  const personalAssetUrn = await uploadImage(brandedJpegBuffer, personUrn);

  logger.info('👤 Creating personal profile post...');
  const personalPostUrn = await createPost(polishedPost, personalAssetUrn, personUrn);

  // --- ORG POST (parallel-capable, but sequential here to avoid rate limits) ---
  let orgPostUrn = null;
  if (orgUrn) {
    logger.info('🏢 Uploading image for org page post...');
    const orgAssetUrn = await uploadImage(brandedJpegBuffer, orgUrn);

    logger.info('🏢 Creating organization page post...');
    orgPostUrn = await createPost(polishedPost, orgAssetUrn, orgUrn);
  } else {
    logger.info('ℹ️  LINKEDIN_ORG_URN not set — skipping company page post');
  }

  logger.info({ personalPostUrn, orgPostUrn }, `✅ STEP 6 COMPLETE — LinkedIn post(s) published`);
  return { personalPostUrn, orgPostUrn };
}

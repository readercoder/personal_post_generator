// src/lib/linkedinClient.mjs
// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn REST API v2 client (plain fetch — no SDK needed).
//
// Responsibilities:
//   1. uploadImage(jpegBuffer)  → returns LinkedIn asset URN
//   2. createPost(text, assetUrn, authorUrn)  → creates a public post
// ─────────────────────────────────────────────────────────────────────────────

import logger from './logger.mjs';

const LI_BASE = 'https://api.linkedin.com/v2';

function getHeaders(extraHeaders = {}) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token || token === 'your_access_token_here') {
    throw new Error('LINKEDIN_ACCESS_TOKEN is missing or not set in .env');
  }
  return {
    Authorization: `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202401',
    ...extraHeaders,
  };
}

/**
 * Registers an image upload with LinkedIn and uploads the JPEG buffer.
 * Returns the LinkedIn asset URN (e.g. "urn:li:digitalmediaAsset:XXXXX").
 * @param {Buffer} jpegBuffer
 * @param {string} ownerUrn  — "urn:li:person:ID" or "urn:li:organization:ID"
 */
export async function uploadImage(jpegBuffer, ownerUrn) {
  logger.debug({ ownerUrn, sizeKB: Math.round(jpegBuffer.length / 1024) }, '🖼️  Registering LinkedIn image upload...');

  // Step 1: Register upload
  const registerRes = await fetch(`${LI_BASE}/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      ...getHeaders({ 'Content-Type': 'application/json' }),
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: ownerUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    }),
  });

  if (!registerRes.ok) {
    const body = await registerRes.text();
    throw new Error(`LinkedIn register upload failed [${registerRes.status}]: ${body}`);
  }

  const registerData = await registerRes.json();
  const uploadUrl =
    registerData?.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]?.uploadUrl;
  const assetUrn = registerData?.value?.asset;

  if (!uploadUrl || !assetUrn) {
    throw new Error(`LinkedIn register upload response missing uploadUrl or asset: ${JSON.stringify(registerData)}`);
  }

  logger.debug({ assetUrn, uploadUrl }, '📤 Uploading image to LinkedIn CDN...');

  // Step 2: Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      ...getHeaders({ 'Content-Type': 'application/octet-stream' }),
    },
    body: jpegBuffer,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`LinkedIn image upload failed [${uploadRes.status}]: ${body}`);
  }

  logger.info({ assetUrn }, '✅ Image uploaded to LinkedIn successfully');
  return assetUrn;
}

/**
 * Creates a LinkedIn UGC post with an image.
 * @param {string} text       — post body text
 * @param {string} assetUrn   — LinkedIn image asset URN
 * @param {string} authorUrn  — "urn:li:person:ID" or "urn:li:organization:ID"
 * @returns {string} — the created post URN
 */
export async function createPost(text, assetUrn, authorUrn) {
  logger.debug({ authorUrn, assetUrn, textLength: text.length }, '📝 Creating LinkedIn post...');

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'IMAGE',
        media: [
          {
            status: 'READY',
            description: { text: '' },
            media: assetUrn,
            title: { text: '' },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch(`${LI_BASE}/ugcPosts`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`LinkedIn create post failed [${res.status}]: ${errBody}`);
  }

  const data = await res.json();
  const postUrn = data?.id || res.headers.get('X-RestLi-Id') || 'unknown';
  logger.info({ postUrn, authorUrn }, '✅ LinkedIn post published successfully');
  return postUrn;
}

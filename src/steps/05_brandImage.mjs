// src/steps/05_brandImage.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Local Branding Compositor (sharp + SVG overlay)
//   INPUT:  imageBuffer (PNG), postTitle, bullet1, bullet2, bullet3
//   OUTPUT: brandedJpegBuffer (JPEG with branded overlay)
//
// Composites a dark gradient panel + title + 3 bullets onto the FLUX image.
// Pure sharp + SVG — no canvas dependency needed.
// ─────────────────────────────────────────────────────────────────────────────

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import logger from '../lib/logger.mjs';

// Output directory for saving branded images locally (for debug/archive)
const OUTPUT_DIR = './output';

/** Escape XML special characters for safe SVG embedding */
function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Word-wrap text at maxWidth characters, return array of lines.
 * Simple greedy wrapper.
 */
function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxWidth) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build SVG overlay with:
 * - Dark gradient panel across the bottom third
 * - Bold post title
 * - 3 bullet points
 * - LinkedIn-blue left accent bar
 */
function buildSvgOverlay(postTitle, bullet1, bullet2, bullet3, width = 1024, height = 1024) {
  const panelY = Math.round(height * 0.55);  // panel starts 55% down
  const panelH = height - panelY;

  // Wrap title at ~38 chars / line
  const titleLines = wrapText(postTitle, 38);
  const titleFontSize = 46;
  const titleLineHeight = 54;
  const titleStartY = panelY + 55;

  // Bullets start after title
  const bulletStartY = titleStartY + titleLines.length * titleLineHeight + 20;
  const bulletFontSize = 28;
  const bulletLineHeight = 42;

  const safeTitleLines = titleLines.map(xmlEscape);
  const safeBullet1 = xmlEscape(bullet1);
  const safeBullet2 = xmlEscape(bullet2);
  const safeBullet3 = xmlEscape(bullet3);

  const titleSvg = safeTitleLines
    .map((line, i) => `<text x="60" y="${titleStartY + i * titleLineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="#FFFFFF">${line}</text>`)
    .join('\n');

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000614" stop-opacity="0.0"/>
      <stop offset="30%" stop-color="#000614" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#000614" stop-opacity="0.97"/>
    </linearGradient>
  </defs>

  <!-- Gradient panel -->
  <rect x="0" y="${panelY}" width="${width}" height="${height - panelY + 1}" fill="url(#panelGrad)"/>

  <!-- LinkedIn blue left accent bar -->
  <rect x="0" y="${panelY + 20}" width="6" height="${panelH - 40}" fill="#0A66C2" rx="3"/>

  <!-- Title lines -->
  ${titleSvg}

  <!-- Bullets -->
  <text x="60" y="${bulletStartY}" font-family="Arial, Helvetica, sans-serif" font-size="${bulletFontSize}" fill="#CCDDFF">${safeBullet1}</text>
  <text x="60" y="${bulletStartY + bulletLineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${bulletFontSize}" fill="#CCDDFF">${safeBullet2}</text>
  <text x="60" y="${bulletStartY + bulletLineHeight * 2}" font-family="Arial, Helvetica, sans-serif" font-size="${bulletFontSize}" fill="#CCDDFF">${safeBullet3}</text>
</svg>`;
}

export async function brandImage(imageBuffer, postTitle, bullet1, bullet2, bullet3, postNumber = 'unknown') {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 5 ▶  Branding Compositor (sharp + SVG overlay)');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.debug({ postTitle, bullet1, bullet2, bullet3 }, '🎨 Overlay elements');

  // Get image dimensions to build accurate SVG
  const meta = await sharp(imageBuffer).metadata();
  const { width = 1024, height = 1024 } = meta;
  logger.debug({ width, height, format: meta.format }, '📐 Input image metadata');

  const svgOverlay = buildSvgOverlay(postTitle, bullet1, bullet2, bullet3, width, height);
  logger.debug({ svgLength: svgOverlay.length }, '🖌️  SVG overlay generated');

  const brandedBuffer = await sharp(imageBuffer)
    .png()
    .composite([
      {
        input: Buffer.from(svgOverlay, 'utf8'),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  logger.info({ sizeKB: Math.round(brandedBuffer.length / 1024) }, '🖼️  Branding applied');

  // Save to output/ for inspection
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const outputPath = path.join(OUTPUT_DIR, `post_${postNumber}_branded.jpg`);
  fs.writeFileSync(outputPath, brandedBuffer);
  logger.info({ path: outputPath }, `💾 Branded image saved locally`);

  logger.info(`✅ STEP 5 COMPLETE — Branded JPEG ready (${Math.round(brandedBuffer.length / 1024)} KB)`);
  return brandedBuffer;
}

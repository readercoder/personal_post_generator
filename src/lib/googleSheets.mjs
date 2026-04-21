// src/lib/googleSheets.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets client using Service Account authentication.
// Reads rows where Posted = No, and updates rows when a post is published.
//
// Sheet structure expected (tab: Post_Pipeline):
//   Column A: Post_Number
//   Column B: Post
//   Column C: Posted    (value: "Yes" or "No")
//   Column D: row_number  (the actual sheet row index — 1-based, header = row 1)
// ─────────────────────────────────────────────────────────────────────────────

import { google } from 'googleapis';
import fs from 'fs';
import logger from './logger.mjs';

let _sheets = null;
let _auth = null;

/** Initialize the Google Sheets API client once. */
async function getClient() {
  if (_sheets) return { sheets: _sheets, auth: _auth };

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error(
      `Google Service Account key not found at: ${keyPath}\n` +
      `Please place your service account JSON at that path.`
    );
  }

  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  _auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheets = google.sheets({ version: 'v4', auth: _auth });
  logger.debug({ keyPath }, '✅ Google Sheets client initialized');
  return { sheets: _sheets, auth: _auth };
}

/**
 * Fetch all unposted rows from the sheet.
 * Returns an array of objects: { postText, postNumber, rowIndex }
 * rowIndex is the 1-based spreadsheet row number (header = row 1, data starts at row 2).
 */
export async function getUnpostedRows() {
  const { sheets } = await getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB || 'Post_Pipeline';

  logger.debug({ spreadsheetId, tab }, '📋 Reading Google Sheet...');

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:D`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    logger.warn('❌ Google Sheet is empty or only has a header row.');
    return [];
  }

  const header = rows[0].map(h => h.trim().toLowerCase());
  logger.debug({ header }, '📋 Sheet headers detected');

  // Dynamically find column indices by header name
  const colPost      = header.indexOf('post');
  const colNumber    = header.indexOf('post_number');
  const colPosted    = header.indexOf('posted');

  if (colPost === -1 || colPosted === -1) {
    throw new Error(
      `Required columns not found in sheet header: ${header.join(', ')}\n` +
      `Expected columns: Post, Post_Number, Posted`
    );
  }

  const unposted = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const posted = (row[colPosted] || '').trim().toLowerCase();
    if (posted !== 'yes') {
      unposted.push({
        postText:   (row[colPost]   || '').trim(),
        postNumber: (row[colNumber] || String(i)).trim(),
        rowIndex:   i + 1,  // +1 because row[0] is header (= sheet row 1), data starts at row 2
      });
    }
  }

  logger.info({ total: rows.length - 1, unposted: unposted.length }, '📊 Sheet scan complete');
  return unposted;
}

/**
 * Mark a row as Posted = Yes in the spreadsheet.
 * @param {number} rowIndex — 1-based sheet row number (including header)
 */
export async function markRowAsPosted(rowIndex) {
  const { sheets } = await getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB || 'Post_Pipeline';

  // Find the column index of 'Posted' dynamically
  const headerResp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`,
  });
  const header = (headerResp.data.values?.[0] || []).map(h => h.trim().toLowerCase());
  const colPosted = header.indexOf('posted');
  if (colPosted === -1) throw new Error('Column "Posted" not found in sheet header.');

  // Convert column index to A1 notation letter (0=A, 1=B, 2=C...)
  const colLetter = String.fromCharCode(65 + colPosted);
  const range = `${tab}!${colLetter}${rowIndex}`;

  logger.debug({ range, rowIndex }, '✏️  Marking row as Posted = Yes');

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [['Yes']] },
  });

  logger.info({ rowIndex, range }, '✅ Row marked as Posted = Yes in Google Sheet');
}

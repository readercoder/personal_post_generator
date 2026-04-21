// src/scripts/getLinkedInToken.mjs
// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME HELPER: LinkedIn OAuth2 Token Exchange
//
// Usage:
//   1. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env
//   2. Run: npm run get-linkedin-token
//   3. Browser opens automatically — authorize the app
//   4. Copy the access token that's printed to terminal
//   5. Paste it into LINKEDIN_ACCESS_TOKEN in .env
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import { exec } from 'child_process';
import logger from '../lib/logger.mjs';

/** Opens a URL in the default browser cross-platform */
function openBrowser(url) {
  const cmd =
    process.platform === 'win32'  ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
                                    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) logger.warn('⚠️  Could not auto-open browser. Please open the URL manually.');
  });
}

const CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3000/callback';
const PORT          = 3000;

// Scopes for personal posts only.
// NOTE: w_organization_social requires LinkedIn "Marketing Developer Platform"
// approval and is NOT available on standard apps.
const SCOPES = [
  'openid',
  'profile',
  'w_member_social',
].join(' ');

if (!CLIENT_ID || CLIENT_ID === 'your_app_client_id') {
  logger.error('❌ LINKEDIN_CLIENT_ID is not set in .env');
  logger.error('👉 Create a LinkedIn App at: https://www.linkedin.com/developers/apps');
  process.exit(1);
}
if (!CLIENT_SECRET || CLIENT_SECRET === 'your_app_client_secret') {
  logger.error('❌ LINKEDIN_CLIENT_SECRET is not set in .env');
  process.exit(1);
}

const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', 'linkedin_token_helper');

logger.info('');
logger.info('╔══════════════════════════════════════════════════════════════╗');
logger.info('║   LinkedIn OAuth2 Token Helper                              ║');
logger.info('╚══════════════════════════════════════════════════════════════╝');
logger.info('');
logger.info('📋 SETUP CHECKLIST:');
logger.info('   1. Go to: https://www.linkedin.com/developers/apps');
logger.info('   2. Create app (or use existing) → Auth tab');
logger.info(`   3. Add redirect URL: ${REDIRECT_URI}`);
logger.info('   4. Request products: "Share on LinkedIn" + "Sign In with LinkedIn using OpenID Connect"');
logger.info('      (w_organization_social / Marketing Developer Platform is NOT needed for personal posts)');
logger.info('');
logger.info('🔗 STEP — Open this URL in your browser:');
logger.info('');
logger.info(`   ${authUrl.toString()}`);
logger.info('');
logger.info('⏳ Waiting for LinkedIn to redirect to localhost:3000/callback...');
logger.info('   (auto-opening browser now...)');

// Auto-open the URL in the default browser
openBrowser(authUrl.toString());

// ─── Server — declared BEFORE idleTimer so the timer closure can reference it ───
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) return;

  const callbackUrl = new URL(req.url, `http://localhost:${PORT}`);
  const code  = callbackUrl.searchParams.get('code');
  const error = callbackUrl.searchParams.get('error');

  // Clear the idle timeout now that we have a response
  clearTimeout(idleTimer);

  if (error) {
    res.end(`<h2>Error: ${error}</h2><p>${callbackUrl.searchParams.get('error_description')}</p>`);
    logger.error({ error }, '❌ LinkedIn auth error');
    server.close();
    return;
  }

  if (!code) {
    res.end('<h2>No code received</h2>');
    logger.error('❌ No authorization code received from LinkedIn');
    server.close();
    return;
  }

  logger.info({ code }, '✅ Authorization code received. Exchanging for access token...');

  // Exchange code for token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    res.end(`<h2>Token exchange failed</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
    logger.error({ tokenData }, '❌ Token exchange failed');
    server.close();
    return;
  }

  const { access_token, expires_in } = tokenData;

  // Fetch your LinkedIn person ID via OpenID Connect userinfo
  // (uses /v2/userinfo because we have openid+profile scope, not legacy r_liteprofile)
  const meRes  = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const meData   = meRes.ok ? await meRes.json() : {};
  // `sub` is the numeric person ID in OpenID Connect responses
  const personId = meData.sub || '(could not fetch — try manually)';

  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════════════╗');
  logger.info('║  ✅ SUCCESS! Add these to your .env file:                   ║');
  logger.info('╚══════════════════════════════════════════════════════════════╝');
  logger.info('');
  logger.info(`LINKEDIN_ACCESS_TOKEN=${access_token}`);
  logger.info(`LINKEDIN_PERSON_URN=${personId}`);
  logger.info(`# Token expires in: ${Math.round(expires_in / 86400)} days`);
  logger.info('');
  logger.info('📋 For ORG_URN: go to your LinkedIn Company Page URL:');
  logger.info('   https://www.linkedin.com/company/YOUR_NUMBER/admin/');
  logger.info('   Copy just the number from the URL.');
  logger.info('');

  res.end(`
    <h2>✅ LinkedIn Token obtained!</h2>
    <p>Check your terminal for the access token and person URN.</p>
    <p><b>Token expires in:</b> ${Math.round(expires_in / 86400)} days</p>
    <p><b>Person ID:</b> ${personId}</p>
    <p>You can close this window now.</p>
  `);

  server.close();
});

server.listen(PORT, () => {
  logger.debug({ port: PORT }, `🌐 Callback server listening on http://localhost:${PORT}`);
});

// Safety timeout — 5 minutes. Declared AFTER server so the closure is valid.
const TIMEOUT_MS = 5 * 60 * 1000;
// eslint-disable-next-line prefer-const
let idleTimer = setTimeout(() => {
  logger.error('❌ Timed out after 5 minutes with no callback. Please try again.');
  server.close();
  process.exit(1);
}, TIMEOUT_MS);
idleTimer.unref(); // Don't prevent process exit

// ─────────────────────────────────────────────
// scripts/get-refresh-token.js
// One-time helper to generate a Gmail OAuth2 refresh token.
//
// Usage:
//   1. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
//      to your .env file (or set them as environment variables).
//   2. Run:  node scripts/get-refresh-token.js
//   3. Open the printed URL in a browser.
//   4. Sign in with the Gmail account you want SkillBridge to send from.
//   5. Copy the authorization code from the redirect URL.
//   6. Paste it when prompted.
//   7. Copy the printed refresh_token and set it as GOOGLE_REFRESH_TOKEN
//      in your .env and in Render's environment variables.
//
// IMPORTANT: Keep the refresh token secret. Never commit it to Git.
// ─────────────────────────────────────────────

'use strict';

require('dotenv').config();

const { google } = require('googleapis');
const readline  = require('readline');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error(
    '\nError: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI ' +
    'must be set in your .env file.\n'
  );
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes required to send email on behalf of the account.
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'   // Always ask for consent so a refresh token is returned.
});

console.log('\n──────────────────────────────────────────────────');
console.log('Gmail OAuth2 Refresh Token Generator');
console.log('──────────────────────────────────────────────────');
console.log('\nStep 1: Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nStep 2: Sign in with the Gmail account SkillBridge will use to send OTP emails.');
console.log('        Allow the requested permissions.');
console.log('\nStep 3: After authorization, your browser will redirect to a URL like:');
console.log('        http://localhost:3000/auth/google/callback?code=4/0AX...&scope=...');
console.log('        Copy the value of the "code" parameter.\n');

const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout
});

rl.question('Paste the authorization code here and press Enter:\n> ', async (code) => {
  rl.close();

  if (!code || !code.trim()) {
    console.error('\nNo code provided. Exiting.\n');
    process.exit(1);
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());

    console.log('\n──────────────────────────────────────────────────');
    console.log('Success! Your Gmail OAuth2 tokens:');
    console.log('──────────────────────────────────────────────────');
    console.log('\nAccess token (temporary, auto-refreshed):');
    console.log(tokens.access_token);
    console.log('\nRefresh token (permanent — keep this secret!):');
    console.log(tokens.refresh_token);
    console.log('\n──────────────────────────────────────────────────');
    console.log('\nNext steps:');
    console.log('1. Add the following to your .env file:');
    console.log(`   GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`   GOOGLE_EMAIL=the_gmail_address_you_just_signed_in_with`);
    console.log('\n2. Add both variables to Render\'s Environment Variables.');
    console.log('\n3. Never commit these values to Git.\n');

  } catch (err) {
    console.error('\nFailed to exchange code for tokens:', err.message);
    if (err.response) {
      console.error('Details:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
});

// ─────────────────────────────────────────────
// utils/mailer.js
// Gmail OAuth 2.0 transporter — server-side only.
// Never expose client secrets or tokens to the browser.
// ─────────────────────────────────────────────

'use strict';

const { google } = require('googleapis');

// ─────────────────────────────────────────────
// OAuth2 client
// ─────────────────────────────────────────────

function buildOAuth2Client() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Gmail OAuth configuration is incomplete. ' +
      'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.'
    );
  }

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error(
      'GOOGLE_REFRESH_TOKEN is not set. ' +
      'Generate one using the OAuth2 playground or the helper script.'
    );
  }

  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  return oAuth2Client;
}

// ─────────────────────────────────────────────
// Obtain a fresh access token and return a Gmail API instance
// ─────────────────────────────────────────────

async function getGmailClient() {
  const auth = buildOAuth2Client();
  return google.gmail({ version: 'v1', auth });
}

// ─────────────────────────────────────────────
// Build a RFC-2822 raw message string
// ─────────────────────────────────────────────

function buildRawMessage({ to, subject, htmlBody, textBody }) {
  const senderEmail = process.env.GOOGLE_EMAIL;

  if (!senderEmail) {
    throw new Error('GOOGLE_EMAIL is not set.');
  }

  const boundary = `sb_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers = [
    `From: SkillBridge <${senderEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].join('\r\n');

  const plainPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    textBody
  ].join('\r\n');

  const htmlPart = [
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlBody,
    `--${boundary}--`
  ].join('\r\n');

  const raw = `${headers}\r\n\r\n${plainPart}\r\n\r\n${htmlPart}`;

  // Gmail API requires base64url encoding
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ─────────────────────────────────────────────
// sendOtpEmail — public API
// ─────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to the given email address.
 *
 * @param {string} to        Recipient email address
 * @param {string} otp       6-digit OTP string (plain text, hashed before storage)
 * @param {string} role      'student' | 'alumni'
 * @param {string} fullName  Recipient's full name
 */
async function sendOtpEmail(to, otp, role, fullName) {
  const displayRole =
    role === 'alumni' ? 'MCA Alumni' : 'MCA Student';

  const textBody = [
    `Hello ${fullName},`,
    ``,
    `Your SkillBridge ${displayRole} registration OTP is:`,
    ``,
    `  ${otp}`,
    ``,
    `This code expires in 5 minutes.`,
    `If you did not register on SkillBridge, please ignore this email.`,
    ``,
    `– The SkillBridge Team`,
    `PSG College of Technology · Department of Computer Applications`
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>SkillBridge OTP</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a6b3c;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
              Skill<span style="font-weight:400;">Bridge</span>
            </h1>
            <p style="margin:4px 0 0;color:#a8d5b5;font-size:13px;">
              PSG College of Technology · MCA Department
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#333;font-size:15px;">
              Hello <strong>${fullName}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              You are registering as a <strong>${displayRole}</strong> on SkillBridge.
              Please use the OTP below to verify your email address.
            </p>

            <!-- OTP box -->
            <div style="text-align:center;margin:0 0 28px;">
              <div style="display:inline-block;background:#f0faf4;border:2px solid #1a6b3c;
                          border-radius:10px;padding:18px 40px;">
                <span style="font-size:38px;font-weight:800;letter-spacing:10px;color:#1a6b3c;">
                  ${otp}
                </span>
              </div>
              <p style="margin:12px 0 0;color:#888;font-size:12px;">
                Valid for <strong>5 minutes</strong> · Single use only
              </p>
            </div>

            <p style="margin:0 0 8px;color:#555;font-size:13px;line-height:1.6;">
              Enter this code on the SkillBridge OTP verification page to complete your registration.
            </p>
            <p style="margin:0;color:#999;font-size:12px;">
              If you did not initiate this registration, please ignore this email. No account will be created.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f5;border-top:1px solid #eee;padding:16px 32px;">
            <p style="margin:0;color:#aaa;font-size:11px;text-align:center;">
              © ${new Date().getFullYear()} SkillBridge · PSG College of Technology · Department of Computer Applications
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const gmail = await getGmailClient();

  const raw = buildRawMessage({
    to,
    subject: `${otp} is your SkillBridge verification code`,
    htmlBody,
    textBody
  });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}

module.exports = { sendOtpEmail };

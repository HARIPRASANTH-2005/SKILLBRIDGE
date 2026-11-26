// ─────────────────────────────────────────────
// utils/otp.js
// Secure OTP generation, hashing and verification helpers.
// OTPs are stored hashed — never in plain text.
// ─────────────────────────────────────────────

'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────
// Configuration constants
// ─────────────────────────────────────────────

const OTP_LENGTH         = 6;    // digits
const OTP_TTL_MS         = 5 * 60 * 1000;    // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;         // 60 seconds
const MAX_ATTEMPTS       = 5;                 // per OTP session
const BCRYPT_ROUNDS      = 10;

// ─────────────────────────────────────────────
// Generate a cryptographically secure OTP
// ─────────────────────────────────────────────

/**
 * Returns a zero-padded 6-digit numeric OTP string.
 * Uses crypto.randomInt to avoid modulo bias.
 */
function generateOtp() {
  const otp = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(otp).padStart(OTP_LENGTH, '0');
}

// ─────────────────────────────────────────────
// Hash and verify
// ─────────────────────────────────────────────

/**
 * Returns a bcrypt hash of the given OTP string.
 */
async function hashOtp(otp) {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

/**
 * Compares a plain-text OTP against a stored hash.
 */
async function verifyOtp(plainOtp, hashedOtp) {
  return bcrypt.compare(plainOtp, hashedOtp);
}

// ─────────────────────────────────────────────
// Session payload builder
// ─────────────────────────────────────────────

/**
 * Builds the session object to store for an OTP session.
 * Stores the hash — never the plain OTP.
 *
 * @param {string} hashedOtp   bcrypt hash of the OTP
 * @param {string} email       registrant email
 * @param {string} role        'student' | 'alumni'
 * @param {object} formPayload  serialisable registration data (no file paths)
 * @param {string} fileInfo     JSON string of uploaded file metadata
 */
function buildOtpSession(hashedOtp, email, role, formPayload, fileInfo) {
  const now = Date.now();
  return {
    hashedOtp,
    email,
    role,
    formPayload,
    fileInfo,
    issuedAt: now,
    expiresAt: now + OTP_TTL_MS,
    resendAllowedAt: now + RESEND_COOLDOWN_MS,
    attempts: 0
  };
}

// ─────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────

function isExpired(otpSession) {
  return Date.now() > otpSession.expiresAt;
}

function isResendCoolingDown(otpSession) {
  return Date.now() < otpSession.resendAllowedAt;
}

function isExhausted(otpSession) {
  return otpSession.attempts >= MAX_ATTEMPTS;
}

function secondsUntilResend(otpSession) {
  const ms = Math.max(0, otpSession.resendAllowedAt - Date.now());
  return Math.ceil(ms / 1000);
}

function secondsUntilExpiry(otpSession) {
  const ms = Math.max(0, otpSession.expiresAt - Date.now());
  return Math.ceil(ms / 1000);
}

module.exports = {
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  generateOtp,
  hashOtp,
  verifyOtp,
  buildOtpSession,
  isExpired,
  isResendCoolingDown,
  isExhausted,
  secondsUntilResend,
  secondsUntilExpiry
};

// ─────────────────────────────────────────────
// routes/otp.js
// OTP verification and resend endpoints.
// These routes handle both student and alumni registrations.
// ─────────────────────────────────────────────

'use strict';

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const fs      = require('fs/promises');

const User        = require('../models/User');
const { isDbConnected } = require('../config/db');

const {
  generateOtp,
  hashOtp,
  verifyOtp,
  buildOtpSession,
  isExpired,
  isResendCoolingDown,
  isExhausted,
  secondsUntilResend,
  secondsUntilExpiry
} = require('../utils/otp');

const { sendOtpEmail } = require('../utils/mailer');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Retrieves the pending registration session object.
 * Supports both pendingRegistration and otpSession property names.
 */
function getPendingSession(req) {
  if (!req.session) return null;
  return req.session.pendingRegistration || req.session.otpSession || null;
}

/**
 * Sets the pending registration in session under both property names.
 */
function setPendingSession(req, sessionData) {
  if (!req.session) return;
  req.session.pendingRegistration = sessionData;
  req.session.otpSession          = sessionData;
}

/**
 * Clears pending registration and CSRF data from session.
 */
function clearPendingSession(req) {
  if (!req.session) return;
  delete req.session.pendingRegistration;
  delete req.session.otpSession;
  delete req.session.csrfToken;
}

/**
 * Saves the session asynchronously and resolves when complete.
 * Essential when using connect-mongo to avoid race conditions on redirects.
 */
function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve();
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Masks an email for display: "h*****@gmail.com"
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return '****';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 1);
  const stars   = '*'.repeat(Math.min(local.length - 1, 5));
  return `${visible}${stars}@${domain}`;
}

/**
 * Generates or retrieves a CSRF token stored in the session.
 */
function getOrCreateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

/**
 * Safely validates the CSRF token without throwing Buffer length errors.
 */
function validateCsrf(req) {
  const sessionToken = req.session && req.session.csrfToken;
  const bodyToken    = req.body && req.body._csrf;

  if (typeof sessionToken !== 'string' || typeof bodyToken !== 'string') {
    return false;
  }

  const bufA = Buffer.from(sessionToken);
  const bufB = Buffer.from(bodyToken);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Removes an uploaded file from disk on failure or expiration.
 */
async function cleanupFile(savedPath) {
  if (!savedPath) return;
  try {
    await fs.unlink(savedPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('OTP cleanup: file removal failed:', err.message);
    }
  }
}

/**
 * Renders the OTP verification page.
 */
function renderOtpPage(req, res, { error = null, info = null } = {}) {
  const session = getPendingSession(req);

  if (!session) {
    return res.redirect('/login');
  }

  const remaining      = secondsUntilExpiry(session);
  const resendCooldown = secondsUntilResend(session);

  return res.render('auth/verify-otp', {
    title: 'Verify Your Email — SkillBridge',
    maskedEmail: maskEmail(session.email),
    role: session.role,
    error,
    info,
    remainingSeconds: remaining,
    resendCooldownSeconds: resendCooldown,
    csrfToken: getOrCreateCsrfToken(req)
  });
}


// ─────────────────────────────────────────────
// GET /verify-otp
// Display OTP entry page (after initiating registration)
// ─────────────────────────────────────────────

router.get('/verify-otp', async (req, res) => {
  const session = getPendingSession(req);

  if (!session) {
    return res.redirect('/login');
  }

  // Ensure CSRF token is generated and session is persisted
  getOrCreateCsrfToken(req);
  await saveSession(req);

  return renderOtpPage(req, res);
});


// ─────────────────────────────────────────────
// POST /verify-otp
// Verify submitted OTP and create user account
// ─────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => {
  const otpSession = getPendingSession(req);

  if (!otpSession) {
    return res.redirect('/login');
  }

  // ── CSRF check ──────────────────────────────
  if (!validateCsrf(req)) {
    return renderOtpPage(req, res, {
      error: 'Invalid or expired form submission. Please enter the OTP again.'
    });
  }

  // ── OTP expired check ───────────────────────
  if (isExpired(otpSession)) {
    const role = otpSession.role || 'student';
    const fileInfo = otpSession.fileInfo;
    clearPendingSession(req);
    await saveSession(req);

    if (fileInfo && fileInfo.savedPath) {
      await cleanupFile(fileInfo.savedPath);
    }

    return res.redirect(`/${role}/register`);
  }

  // ── Brute-force guard ───────────────────────
  if (isExhausted(otpSession)) {
    const role = otpSession.role || 'student';
    const fileInfo = otpSession.fileInfo;
    clearPendingSession(req);
    await saveSession(req);

    if (fileInfo && fileInfo.savedPath) {
      await cleanupFile(fileInfo.savedPath);
    }

    return res.redirect(`/${role}/register`);
  }

  // ── Validate OTP format ─────────────────────
  const submittedOtp =
    typeof req.body.otp === 'string'
      ? req.body.otp.trim()
      : '';

  if (!/^\d{6}$/.test(submittedOtp)) {
    otpSession.attempts = (otpSession.attempts || 0) + 1;
    setPendingSession(req, otpSession);
    await saveSession(req);

    return renderOtpPage(req, res, {
      error: 'Please enter a valid 6-digit code.'
    });
  }

  // ── Verify hash ─────────────────────────────
  const isValid = await verifyOtp(submittedOtp, otpSession.hashedOtp);

  if (!isValid) {
    otpSession.attempts = (otpSession.attempts || 0) + 1;
    const attemptsLeft = 5 - otpSession.attempts;

    if (attemptsLeft <= 0) {
      const role = otpSession.role || 'student';
      const fileInfo = otpSession.fileInfo;
      clearPendingSession(req);
      await saveSession(req);

      if (fileInfo && fileInfo.savedPath) {
        await cleanupFile(fileInfo.savedPath);
      }
      return res.redirect(`/${role}/register`);
    }

    setPendingSession(req, otpSession);
    await saveSession(req);

    return renderOtpPage(req, res, {
      error: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
    });
  }

  // ── OTP is valid — create user account in MongoDB ──
  if (!isDbConnected()) {
    return renderOtpPage(req, res, {
      error: 'Registration is temporarily unavailable because the database is disconnected. Please try again.'
    });
  }

  const { role, email, formPayload, fileInfo } = otpSession;

  try {
    // Check for duplicate accounts right before saving (race-condition protection)
    const existingUser = await User.findOne({
      $or: [
        { email },
        {
          role: { $in: ['student', 'alumni'] },
          rollNumber: formPayload.rollNumber
        }
      ]
    }).select('_id');

    if (existingUser) {
      clearPendingSession(req);
      await saveSession(req);

      if (fileInfo && fileInfo.savedPath) {
        await cleanupFile(fileInfo.savedPath);
      }

      return res.redirect(`/${role}/register`);
    }

    // Build the user document from verified session payload
    const userDoc = {
      fullName: formPayload.fullName,
      email:    formPayload.email,
      password: formPayload.hashedPassword,
      mobile:   formPayload.mobile || '',
      role,
      status:   'pending',
      rollNumber: formPayload.rollNumber,
      documentFilename:     fileInfo.filename,
      documentOriginalName: fileInfo.originalname,
      documentMimeType:     fileInfo.mimetype,
      documentSizeBytes:    fileInfo.size
    };

    if (role === 'student') {
      userDoc.currentYear      = formPayload.currentYear;
      userDoc.admissionBatch   = formPayload.admissionBatch;
      userDoc.expectedGradYear = formPayload.expectedGradYear;
    } else if (role === 'alumni') {
      userDoc.admissionBatch  = formPayload.admissionBatch;
      userDoc.graduationYear  = formPayload.graduationYear;
      userDoc.profession      = formPayload.profession || '';
      userDoc.company         = formPayload.company || '';
      userDoc.linkedin        = formPayload.linkedin || '';
    }

    const newUser = new User(userDoc);
    await newUser.save();

    // Clear pending registration session completely
    clearPendingSession(req);
    await saveSession(req);

    // Redirect to login page with verified success indicator
    return res.redirect('/login?verified=true');

  } catch (err) {
    console.error('OTP account creation error:', err.message);

    if (err.code === 11000 || err.name === 'ValidationError') {
      clearPendingSession(req);
      await saveSession(req);
      if (fileInfo && fileInfo.savedPath) {
        await cleanupFile(fileInfo.savedPath);
      }
      return res.redirect(`/${role}/register`);
    }

    return renderOtpPage(req, res, {
      error: 'Account creation failed due to a server error. Please try again.'
    });
  }
});


// ─────────────────────────────────────────────
// POST /resend-otp
// Resend OTP to the same email (with cooldown)
// ─────────────────────────────────────────────

router.post('/resend-otp', async (req, res) => {
  const otpSession = getPendingSession(req);

  if (!otpSession) {
    return res.redirect('/login');
  }

  // ── CSRF check ──────────────────────────────
  if (!validateCsrf(req)) {
    return renderOtpPage(req, res, {
      error: 'Invalid session. Please refresh and try again.'
    });
  }

  // ── Cooldown guard ──────────────────────────
  if (isResendCoolingDown(otpSession)) {
    return renderOtpPage(req, res, {
      error: `Please wait ${secondsUntilResend(otpSession)} seconds before requesting a new code.`
    });
  }

  // ── Generate fresh OTP ──────────────────────
  try {
    const newOtp       = generateOtp();
    const newHashedOtp = await hashOtp(newOtp);

    const updatedSession = buildOtpSession(
      newHashedOtp,
      otpSession.email,
      otpSession.role,
      otpSession.formPayload,
      otpSession.fileInfo
    );

    setPendingSession(req, updatedSession);
    await saveSession(req);

    // Send new OTP email via Gmail API
    await sendOtpEmail(
      otpSession.email,
      newOtp,
      otpSession.role,
      otpSession.formPayload.fullName
    );

    return renderOtpPage(req, res, {
      info: `A new verification code has been sent to ${maskEmail(otpSession.email)}.`
    });

  } catch (err) {
    console.error('Resend OTP error:', err.message);

    return renderOtpPage(req, res, {
      error: 'Failed to send a new OTP. Please check your network or try again shortly.'
    });
  }
});


module.exports = router;

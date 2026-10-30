// ─────────────────────────────────────────────
//  routes/student.js  —  Current MCA Student Routes
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const upload  = require('../middleware/upload');
const User    = require('../models/User');
const Project = require('../models/Project');
const { isDbConnected } = require('../config/db');
const { requireAuth, requireApproved, requireRole } = require('../middleware/auth');

// GET /student/register  → Student registration form
router.get('/register', (req, res) => {
  if (req.session.user && req.session.user.role === 'student') {
    return res.redirect('/student/dashboard');
  }

  res.render('student/register', {
    title    : 'Current MCA Student Registration — SkillBridge',
    errors   : [],
    formData : {}
  });
});

// POST /student/register  → Process student registration
router.post('/register', upload.single('document'), async (req, res) => {
  const {
    fullName, email, mobile, rollNumber,
    currentYear, admissionBatch, expectedGradYear,
    password, confirmPassword
  } = req.body;

  const errors = [];

  if (!fullName || fullName.trim().length < 2) {
    errors.push({ msg: 'Official full name is required (minimum 2 characters).' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ msg: 'A valid email address is required.' });
  }
  if (!rollNumber || rollNumber.trim().length < 4) {
    errors.push({ msg: 'Official MCA roll number is mandatory.' });
  }
  if (!currentYear || !['1','2'].includes(currentYear)) {
    errors.push({ msg: 'Please select your current year of study (1st or 2nd Year).' });
  }
  if (!admissionBatch || !/^[0-9]{4}$/.test(admissionBatch)) {
    errors.push({ msg: 'Admission batch must be a valid 4-digit year.' });
  }
  if (!expectedGradYear || !/^[0-9]{4}$/.test(expectedGradYear)) {
    errors.push({ msg: 'Expected graduation year must be a valid 4-digit year.' });
  }
  if (!password || password.length < 8) {
    errors.push({ msg: 'Password must be at least 8 characters long.' });
  }
  if (password !== confirmPassword) {
    errors.push({ msg: 'Passwords do not match.' });
  }
  if (!req.file) {
    errors.push({ msg: 'Student ID card or bonafide certificate upload is required for verification.' });
  }

  const cleanRoll = rollNumber ? rollNumber.trim().toUpperCase() : '';
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  if (errors.length > 0) {
    return res.render('student/register', {
      title    : 'Current MCA Student Registration — SkillBridge',
      errors,
      formData : { fullName, email: cleanEmail, mobile, rollNumber: cleanRoll, currentYear, admissionBatch, expectedGradYear }
    });
  }

  if (isDbConnected()) {
    try {
      const existingUser = await User.findOne({
        $or: [{ email: cleanEmail }, { rollNumber: cleanRoll }]
      });

      if (existingUser) {
        errors.push({ msg: 'An account with this email address or MCA roll number already exists.' });
        return res.render('student/register', {
          title    : 'Current MCA Student Registration — SkillBridge',
          errors,
          formData : { fullName, email: cleanEmail, mobile, rollNumber: cleanRoll, currentYear, admissionBatch, expectedGradYear }
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newStudent = new User({
        fullName: fullName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        mobile: mobile ? mobile.trim() : '',
        role: 'student',
        status: 'pending',
        rollNumber: cleanRoll,
        currentYear,
        admissionBatch,
        expectedGradYear,
        documentFilename: req.file.filename,
        documentOriginalName: req.file.originalname,
        documentMimeType: req.file.mimetype,
        documentSizeBytes: req.file.size
      });

      await newStudent.save();
    } catch (err) {
      console.error('Student registration error:', err.message);
      errors.push({ msg: 'Registration could not be completed: ' + err.message });
      return res.render('student/register', {
        title    : 'Current MCA Student Registration — SkillBridge',
        errors,
        formData : { fullName, email: cleanEmail, mobile, rollNumber: cleanRoll, currentYear, admissionBatch, expectedGradYear }
      });
    }
  }

  return res.render('student/register', {
    title    : 'Current MCA Student Registration — SkillBridge',
    errors   : [],
    formData : {},
    success  : `Registration received! Your application (Roll: ${cleanRoll}) and student credentials have been securely queued for department administrator verification. Check your status at /status.`
  });
});

// GET /student/dashboard  → Student Dashboard
router.get('/dashboard', requireAuth, requireRole('student'), async (req, res) => {
  let appliedProjects = [];
  if (isDbConnected() && req.session.user && req.session.user._id) {
    try {
      appliedProjects = await Project.find({
        'proposals.studentId': req.session.user._id
      }).lean();
    } catch (e) {
      console.error('Applied projects query error:', e.message);
    }
  }

  res.render('student/dashboard', {
    title: 'Student Dashboard — SkillBridge',
    appliedProjects
  });
});

// GET /student/profile  → Student Profile & Skills
router.get('/profile', requireAuth, requireRole('student'), (req, res) => {
  res.render('student/profile', {
    title: 'Student Profile & Skills — SkillBridge'
  });
});

// GET /student/tasks  → Assigned Tasks
router.get('/tasks', requireAuth, requireRole('student'), (req, res) => {
  res.render('student/tasks', {
    title: 'Assigned Milestone Tasks — SkillBridge'
  });
});

module.exports = router;

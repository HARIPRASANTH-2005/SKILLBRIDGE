// ─────────────────────────────────────────────
//  routes/index.js  —  Public / homepage routes
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();

// GET /  → render the homepage
router.get('/', (req, res) => {
  res.render('index', { title: 'SkillBridge — PSG Tech MCA Collaboration Platform' });
});

module.exports = router;

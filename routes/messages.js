// ─────────────────────────────────────────────
//  routes/messages.js  —  Project messaging routes
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();

// GET /messages  → Project messaging workspace
router.get('/', (req, res) => {
  res.render('messages/index', {
    title: 'Project Messages — SkillBridge'
  });
});

module.exports = router;


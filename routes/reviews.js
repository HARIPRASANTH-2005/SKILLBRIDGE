// ─────────────────────────────────────────────
//  routes/reviews.js  —  Reviews & feedback routes
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();

// GET /reviews  → Reviews and endorsement showcase
router.get('/', (req, res) => {
  res.render('reviews/index', {
    title: 'Verified Project Reviews — SkillBridge'
  });
});

module.exports = router;


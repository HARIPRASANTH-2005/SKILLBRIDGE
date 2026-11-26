
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Review = require('../models/Review');
const { isDbConnected } = require('../config/db');

const {
  requireAuth,
  requireApproved,
  requireRole
} = require('../middleware/auth');

// GET /reviews
// Student-only Feedback & Reviews page
router.get(
  '/',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res, next) => {
    try {
      const studentId = req.session.user._id;

      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).send('Invalid student account.');
      }

      // Keep the page available if MongoDB is temporarily offline.
      if (!isDbConnected()) {
        return res.render('reviews/index', {
          title: 'Feedback & Reviews — SkillBridge',
          reviews: [],
          stats: {
            totalReviews: 0,
            projectsReviewed: 0,
            averageRating: null,
            technicalSkills: null,
            communication: null,
            teamwork: null
          },
          dbUnavailable: true
        });
      }

      // Fetch only visible alumni reviews written about this student.
      const reviews = await Review.find({
        revieweeId: studentId,
        reviewType: 'alumni_to_student',
        isVisible: true
      })
        .populate({
          path: 'projectId',
          select: 'title'
        })
        .populate({
          path: 'reviewerId',
          select: 'fullName'
        })
        .sort({ createdAt: -1 })
        .lean();

      // Calculate an average while ignoring missing optional ratings.
      const calculateAverage = (field) => {
        const values = reviews
          .map(review => review[field])
          .filter(value =>
            typeof value === 'number' &&
            Number.isFinite(value)
          );

        if (values.length === 0) {
          return null;
        }

        const total = values.reduce(
          (sum, value) => sum + value,
          0
        );

        return Number((total / values.length).toFixed(1));
      };

      const projectIds = new Set(
        reviews
          .filter(review => review.projectId?._id)
          .map(review => String(review.projectId._id))
      );

      const stats = {
        totalReviews: reviews.length,
        projectsReviewed: projectIds.size,
        averageRating: calculateAverage('rating'),
        technicalSkills: calculateAverage('technicalSkills'),
        communication: calculateAverage('communication'),
        teamwork: calculateAverage('teamwork')
      };

      return res.render('reviews/index', {
        title: 'Feedback & Reviews — SkillBridge',
        reviews,
        stats,
        dbUnavailable: false
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

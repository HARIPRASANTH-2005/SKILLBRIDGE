
// ─────────────────────────────────────────────
// models/Review.js
// SkillBridge Project Review Management Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // Project being reviewed.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },

    // User who writes the review.
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // User receiving the review.
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Direction of the review.
    reviewType: {
      type: String,
      enum: [
        'alumni_to_student',
        'student_to_alumni'
      ],
      required: true
    },

    // Overall rating from 1 to 5.
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number from 1 to 5'
      }
    },

    // Written feedback.
    feedback: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000
    },

    // Optional skill-related ratings.
    technicalSkills: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },

    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },

    teamwork: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },

    // Review visibility.
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);


// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

reviewSchema.pre('validate', function () {
  if (this.reviewerId && this.revieweeId &&
      this.reviewerId.equals(this.revieweeId)) {
    this.invalidate(
      'revieweeId',
      'A user cannot review themselves'
    );
  }
});


// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// Prevent duplicate reviews of the same type
// by the same reviewer for the same user/project.
reviewSchema.index(
  {
    projectId: 1,
    reviewerId: 1,
    revieweeId: 1,
    reviewType: 1
  },
  {
    unique: true,
    name: 'unique_project_user_review'
  }
);


// Retrieve reviews received by a user.
reviewSchema.index(
  { revieweeId: 1, createdAt: -1 },
  {
    name: 'review_reviewee_date'
  }
);


// Retrieve reviews written by a user.
reviewSchema.index(
  { reviewerId: 1, createdAt: -1 },
  {
    name: 'review_reviewer_date'
  }
);


// Retrieve reviews for a project.
reviewSchema.index(
  { projectId: 1, createdAt: -1 },
  {
    name: 'review_project_date'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'Review',
  reviewSchema
);

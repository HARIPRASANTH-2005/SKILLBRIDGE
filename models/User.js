


// new changes


// ─────────────────────────────────────────────
// models/User.js
// User Schema — Student, Alumni and Admin
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// VERIFICATION REVIEW HISTORY
// ─────────────────────────────────────────────

const verificationReviewSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    reviewerName: {
      type: String,
      required: true,
      trim: true
    },

    decision: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true
    },

    reason: {
      type: String,
      trim: true,
      default: ''
    },

    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);


// ─────────────────────────────────────────────
// USER SCHEMA
// ─────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {

    // ── Basic account information ────────────────

    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120
    },

    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address'
      ]
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false
    },

    mobile: {
      type: String,
      trim: true,
      default: ''
    },


    // ── Account role and verification status ────

    role: {
      type: String,
      enum: ['student', 'alumni', 'admin'],
      required: true,
      default: 'student'
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: function () {
        return this.role === 'admin' ? 'approved' : 'pending';
      }
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },


    // ── Academic identity ───────────────────────

    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: function () {
        return this.role === 'student' || this.role === 'alumni';
      }
    },

    currentYear: {
      type: String,
      enum: ['1', '2'],
      default: null
    },

    admissionBatch: {
      type: String,
      trim: true,
      default: ''
    },

    expectedGradYear: {
      type: String,
      trim: true,
      default: ''
    },


    // ── Alumni professional information ─────────

    graduationYear: {
      type: String,
      trim: true,
      default: ''
    },

    profession: {
      type: String,
      trim: true,
      default: ''
    },

    company: {
      type: String,
      trim: true,
      default: ''
    },

    linkedin: {
      type: String,
      trim: true,
      default: ''
    },


    // ── Skills ──────────────────────────────────

    skills: {
      type: [
        {
          type: String,
          trim: true
        }
      ],
      default: []
    },


    // ── Verification document metadata ──────────

    documentFilename: {
      type: String,
      default: ''
    },

    documentOriginalName: {
      type: String,
      default: ''
    },

    documentMimeType: {
      type: String,
      default: ''
    },

    documentSizeBytes: {
      type: Number,
      min: 0,
      default: 0
    },


    // ── Verification review history ─────────────

    verificationHistory: {
      type: [verificationReviewSchema],
      default: []
    }

  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);


// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// 1. Email must be unique across all account types.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'unique_user_email'
  }
);


// 2. Academic roll numbers must be unique.
// Admin accounts should not have a rollNumber.
// This partial index includes documents with string roll numbers.
userSchema.index(
  { rollNumber: 1 },
  {
    unique: true,
    name: 'unique_academic_roll_number',
    partialFilterExpression: {
      rollNumber: { $type: 'string' }
    }
  }
);


// 3. Useful for verification queues and admin filtering.
userSchema.index(
  { status: 1, createdAt: -1 },
  {
    name: 'user_status_createdAt'
  }
);


// 4. Useful for role-specific account queries.
userSchema.index(
  { role: 1, status: 1 },
  {
    name: 'user_role_status'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model('User', userSchema);

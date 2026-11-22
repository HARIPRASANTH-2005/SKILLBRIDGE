
// ─────────────────────────────────────────────
// models/Proposal.js
// Student Project Application Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// PROPOSAL SCHEMA
// ─────────────────────────────────────────────

const proposalSchema = new mongoose.Schema(
  {

    // ── Project reference ────────────────────────

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },


    // ── Student reference ────────────────────────

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Preserve identity at application time.
    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    studentRoll: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30
    },


    // ── Application details ──────────────────────

    pitch: {
      type: String,
      required: [true, 'Technical approach pitch is required'],
      trim: true,
      minlength: 10,
      maxlength: 5000
    },

    hoursPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 60
    },

    targetWeeks: {
      type: Number,
      required: true,
      min: 1,
      max: 104,
      default: 4
    },

    repoUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: {
        validator: function (value) {
          if (!value) return true;

          try {
            const parsed = new URL(value);

            return (
              parsed.protocol === 'http:' ||
              parsed.protocol === 'https:'
            );
          } catch {
            return false;
          }
        },
        message: 'Repository URL must be a valid HTTP or HTTPS URL.'
      }
    },


    // ── Application lifecycle ────────────────────

    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      required: true,
      default: 'pending'
    },

    submittedAt: {
      type: Date,
      default: Date.now,
      immutable: true
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

// 1. One application per student per project.
proposalSchema.index(
  { projectId: 1, studentId: 1 },
  {
    unique: true,
    name: 'unique_student_project_proposal'
  }
);


// 2. Alumni proposal-review dashboard.
proposalSchema.index(
  { projectId: 1, status: 1, submittedAt: -1 },
  {
    name: 'proposal_project_status_date'
  }
);


// 3. Student application history.
proposalSchema.index(
  { studentId: 1, submittedAt: -1 },
  {
    name: 'proposal_student_date'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model('Proposal', proposalSchema);

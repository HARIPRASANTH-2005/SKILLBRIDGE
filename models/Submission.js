
// ─────────────────────────────────────────────
// models/Submission.js
// Student Task Submission Management Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// SUBMISSION SCHEMA
// ─────────────────────────────────────────────

const submissionSchema = new mongoose.Schema(
  {

    // ── Project reference ────────────────────────

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },


    // ── Task reference ───────────────────────────

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },


    // ── Student reference ────────────────────────

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },


    // ── Submission content ──────────────────────

    description: {
      type: String,
      required: [true, 'Submission description is required'],
      trim: true,
      minlength: 10,
      maxlength: 5000
    },

    repositoryUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: {
        validator: function (value) {
          if (!value) return true;

          try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
          } catch {
            return false;
          }
        },
        message: 'Repository URL must be a valid HTTP or HTTPS URL'
      }
    },

    liveDemoUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: {
        validator: function (value) {
          if (!value) return true;

          try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
          } catch {
            return false;
          }
        },
        message: 'Live demo URL must be a valid HTTP or HTTPS URL'
      }
    },


    // ── Uploaded file metadata ───────────────────

    attachment: {
      filename: {
        type: String,
        trim: true,
        default: ''
      },

      originalName: {
        type: String,
        trim: true,
        maxlength: 255,
        default: ''
      },

      mimeType: {
        type: String,
        trim: true,
        default: ''
      },

      sizeBytes: {
        type: Number,
        min: 0,
        default: null
      }
    },


    // ── Review workflow ──────────────────────────

    status: {
      type: String,
      enum: [
        'submitted',
        'changes_requested',
        'approved'
      ],
      required: true,
      default: 'submitted'
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    reviewComment: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ''
    },

    reviewedAt: {
      type: Date,
      default: null
    },


    // ── Submission version ───────────────────────

    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1
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

// Retrieve submissions for a particular task.
submissionSchema.index(
  { taskId: 1, submittedAt: -1 },
  {
    name: 'submission_task_date'
  }
);


// Retrieve submissions made by a student.
submissionSchema.index(
  { studentId: 1, submittedAt: -1 },
  {
    name: 'submission_student_date'
  }
);


// Retrieve submissions awaiting review in a project.
submissionSchema.index(
  { projectId: 1, status: 1, submittedAt: -1 },
  {
    name: 'submission_project_status_date'
  }
);


// Prevent duplicate submission versions for a task
// by the same student.
submissionSchema.index(
  { taskId: 1, studentId: 1, version: 1 },
  {
    unique: true,
    name: 'unique_task_student_submission_version'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'Submission',
  submissionSchema
);

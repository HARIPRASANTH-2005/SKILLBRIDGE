
// ─────────────────────────────────────────────
// models/Task.js
// Project Task Management Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// TASK SCHEMA
// ─────────────────────────────────────────────

const taskSchema = new mongoose.Schema(
  {
    // ── Project reference ───────────────────────

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },


    // ── Task information ────────────────────────

    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: 2,
      maxlength: 160
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },


    // ── Task status ─────────────────────────────

    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed'],
      required: true,
      default: 'todo'
    },


    // ── Priority ─────────────────────────────────

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true,
      default: 'medium'
    },


    // ── Student assignment ──────────────────────

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },


    // ── Task creator ────────────────────────────

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },


    // ── Deadline and completion ─────────────────

    dueDate: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },


    // ── Student submission information ──────────

    repositoryUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    deliverableUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    submissionNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ''
    },

    submittedAt: {
      type: Date,
      default: null
    },


    // ── Alumni review information ───────────────

    reviewFeedback: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ''
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    reviewedAt: {
      type: Date,
      default: null
    },

    reviewDecision: {
      type: String,
      enum: ['approved', 'revision_requested', null],
      default: null
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

// Find tasks belonging to a project.
taskSchema.index(
  { projectId: 1, status: 1, createdAt: -1 },
  { name: 'task_project_status_date' }
);


// Find tasks assigned to a student.
taskSchema.index(
  { assignedTo: 1, status: 1, dueDate: 1 },
  { name: 'task_assignee_status_dueDate' }
);


// Find tasks created by an alumni.
taskSchema.index(
  { createdBy: 1, projectId: 1 },
  { name: 'task_creator_project' }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model('Task', taskSchema);

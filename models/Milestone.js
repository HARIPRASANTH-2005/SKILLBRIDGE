
// ─────────────────────────────────────────────
// models/Milestone.js
// Project Milestone Management Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// MILESTONE SCHEMA
// ─────────────────────────────────────────────

const milestoneSchema = new mongoose.Schema(
  {

    // ── Project reference ────────────────────────

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },


    // ── Milestone information ────────────────────

    title: {
      type: String,
      required: [true, 'Milestone title is required'],
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


    // ── Milestone sequence ────────────────────────

    order: {
      type: Number,
      required: true,
      min: 1
    },


    // ── Milestone status ─────────────────────────

    status: {
      type: String,
      enum: [
        'pending',
        'in_progress',
        'completed',
        'blocked'
      ],
      required: true,
      default: 'pending'
    },


    // ── Scheduling ───────────────────────────────

    startDate: {
      type: Date,
      default: null
    },

    dueDate: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },


    // ── Creator ──────────────────────────────────

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

// Retrieve milestones in project sequence.
milestoneSchema.index(
  { projectId: 1, order: 1 },
  {
    unique: true,
    name: 'unique_project_milestone_order'
  }
);


// Retrieve milestones by project and status.
milestoneSchema.index(
  { projectId: 1, status: 1, order: 1 },
  {
    name: 'project_milestone_status_order'
  }
);


// Find milestones created by a particular user.
milestoneSchema.index(
  { createdBy: 1, createdAt: -1 },
  {
    name: 'milestone_creator_date'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'Milestone',
  milestoneSchema
);

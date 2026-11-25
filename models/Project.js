

// new cchanges


// ─────────────────────────────────────────────
// models/Project.js
// Project / Opportunity Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// PROJECT SCHEMA
// ─────────────────────────────────────────────

const projectSchema = new mongoose.Schema(
  {

    // ── Project information ──────────────────────

    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: 5,
      maxlength: 160
    },

    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: 20,
      maxlength: 10000
    },

    category: {
      type: String,
      enum: [
        'web',
        'cloud',
        'mobile',
        'data',
        'systems',
        'ai',
        'general'
      ],
      default: 'web',
      required: true
    },

    skills: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 50
        }
      ],
      default: []
    },

    duration: {
      type: String,
      trim: true,
      maxlength: 60,
      default: '4 Weeks'
    },

    deadline: {
      type: Date,
      default: null
    },

    maxStudents: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 1
    },

    activeStudentCount: {
  type: Number,
  required: true,
  min: 0,
  default: 0
},

    cadence: {
  type: String,
  enum: ['daily', 'weekly', 'biweekly', 'monthly', 'async'],
  default: 'weekly',
  required: true
},


    // ── Project lifecycle ────────────────────────

    status: {
      type: String,
      enum: [
        'open',
        'in_progress',
        'completed',
        'archived'
      ],
      default: 'open',
      required: true
    },


    // ── Alumni creator reference ─────────────────

    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: false
    },

    creatorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    creatorBatch: {
      type: String,
      trim: true,
      default: ''
    },

    creatorCompany: {
      type: String,
      trim: true,
      default: ''
    },

    creatorProfession: {
      type: String,
      trim: true,
      default: ''
    }

  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);




// ─────────────────────────────────────────────
// PROJECT LIFECYCLE VALIDATION
// ─────────────────────────────────────────────

projectSchema.pre('validate', function () {
  if (
    this.status === 'completed' &&
    this.deadline &&
    this.deadline > new Date()
  ) {
    // No automatic status changes here.
    // Project completion must be explicitly authorized.
  }
});





// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// 1. Project listing, filtering and newest-first sorting.
projectSchema.index(
  { status: 1, createdAt: -1 },
  {
    name: 'project_status_createdAt'
  }
);


// 2. Quickly find projects posted by an alumni member.
projectSchema.index(
  { creatorId: 1, createdAt: -1 },
  {
    name: 'project_creator_createdAt'
  }
);


// 3. Text search across project information.
projectSchema.index(
  {
    title: 'text',
    description: 'text',
    skills: 'text'
  },
  {
    name: 'project_text_search'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model('Project', projectSchema);

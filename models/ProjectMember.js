
// ─────────────────────────────────────────────
// models/ProjectMember.js
// Accepted Student Project Membership Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');


// ─────────────────────────────────────────────
// PROJECT MEMBER SCHEMA
// ─────────────────────────────────────────────

const projectMemberSchema = new mongoose.Schema(
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


    // ── Original application reference ───────────

    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      required: true
    },


    // ── Membership information ──────────────────

    role: {
      type: String,
      enum: ['member', 'team_lead'],
      default: 'member',
      required: true
    },

    status: {
      type: String,
      enum: ['active', 'completed', 'removed'],
      default: 'active',
      required: true
    },


    // ── Membership dates ─────────────────────────

    joinedAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },

    completedAt: {
      type: Date,
      default: null
    },

    removedAt: {
      type: Date,
      default: null
    },

    removalReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    }

  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);





// ─────────────────────────────────────────────
// STATUS VALIDATION
// ─────────────────────────────────────────────

projectMemberSchema.pre('validate', function () {
  if (this.status === 'completed' && this.removedAt) {
    this.invalidate(
      'removedAt',
      'A completed member cannot have a removal date'
    );
  }

  if (this.status === 'removed' && this.completedAt) {
    this.invalidate(
      'completedAt',
      'A removed member cannot have a completion date'
    );
  }
});




// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// A student can have only one membership record
// for a particular project.
projectMemberSchema.index(
  { projectId: 1, studentId: 1 },
  {
    unique: true,
    name: 'unique_project_student_membership'
  }
);


// Find active members of a project.
projectMemberSchema.index(
  { projectId: 1, status: 1, joinedAt: -1 },
  {
    name: 'project_member_status_date'
  }
);


// Find projects belonging to a particular student.
projectMemberSchema.index(
  { studentId: 1, status: 1, joinedAt: -1 },
  {
    name: 'student_project_memberships'
  }
);


// Prevent one proposal from creating multiple memberships.
projectMemberSchema.index(
  { proposalId: 1 },
  {
    unique: true,
    name: 'unique_membership_proposal'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'ProjectMember',
  projectMemberSchema
);

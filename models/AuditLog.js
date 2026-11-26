
// ─────────────────────────────────────────────
// models/AuditLog.js
// SkillBridge Audit Log Management Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // User who performed the action.
    // Null is allowed for system-generated events.
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Action performed in the application.
    action: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    // Type of record affected by the action.
    entityType: {
      type: String,
      enum: [
        'User',
        'Project',
        'Proposal',
        'ProjectMember',
        'Milestone',
        'Task',
        'Submission',
        'Notification',
        'Conversation',
        'Message',
        'Review'
      ],
      required: true
    },

    // ID of the affected record.
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    // Optional project context.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },

    // Short description of the event.
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    // Relevant field changes.
    // Store only safe, non-sensitive information here.
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Request information for security investigation.
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 64,
      default: ''
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);


// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// View the activity history of a particular record.
auditLogSchema.index(
  { entityType: 1, entityId: 1, createdAt: -1 },
  {
    name: 'audit_entity_history'
  }
);


// View actions performed by a particular user.
auditLogSchema.index(
  { actorId: 1, createdAt: -1 },
  {
    name: 'audit_actor_history'
  }
);


// View project activity.
auditLogSchema.index(
  { projectId: 1, createdAt: -1 },
  {
    name: 'audit_project_history'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'AuditLog',
  auditLogSchema
);


// ─────────────────────────────────────────────
// models/Conversation.js
// SkillBridge Project Group Conversation Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Only project group conversations are supported.
    type: {
      type: String,
      enum: ['project'],
      required: true,
      default: 'project'
    },

    // Alumni owner + active project students.
    participantIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      required: true,
      validate: {
        validator: function (participants) {
          if (!Array.isArray(participants)) return false;

          // One alumni + at least one student.
          if (participants.length < 2 || participants.length > 101) {
            return false;
          }

          // Every participant must be unique.
          const uniqueIds = new Set(
            participants.map((id) => id.toString())
          );

          return uniqueIds.size === participants.length;
        },
        message: 'Conversation must contain 2–101 unique participants.'
      }
    },

    // Every project conversation belongs to one project.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },

    // Alumni who originally created the conversation.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Latest message information.
    lastMessageAt: {
      type: Date,
      default: null
    },

    lastMessagePreview: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },

    // Archived conversations cannot receive new messages.
    isArchived: {
      type: Boolean,
      default: false
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

conversationSchema.pre('validate', function () {
  if (
    this.createdBy &&
    Array.isArray(this.participantIds) &&
    !this.participantIds.some(
      (id) => id.equals(this.createdBy)
    )
  ) {
    this.invalidate(
      'participantIds',
      'The conversation creator must be a participant.'
    );
  }
});


// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// Find conversations belonging to a user.
conversationSchema.index(
  { participantIds: 1, lastMessageAt: -1 },
  {
    name: 'conversation_participant_last_message'
  }
);

// Find conversations belonging to a project.
conversationSchema.index(
  { projectId: 1, lastMessageAt: -1 },
  {
    name: 'conversation_project_last_message'
  }
);

// Exactly one conversation per project.
conversationSchema.index(
  { projectId: 1 },
  {
    unique: true,
    name: 'conversation_unique_project',
    partialFilterExpression: {
      projectId: { $type: 'objectId' }
    }
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'Conversation',
  conversationSchema
);

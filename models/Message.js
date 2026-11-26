
// ─────────────────────────────────────────────
// models/Message.js
// SkillBridge Chat Message Management Schema
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Conversation to which this message belongs.
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },

    // User who sent the message.
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Message content.
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },

    // Optional file attachment metadata.
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

    // Editing information.
    isEdited: {
      type: Boolean,
      default: false
    },

    editedAt: {
      type: Date,
      default: null
    },

    // Soft deletion preserves conversation history.
    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
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

// A message must contain text or an attachment.
messageSchema.pre('validate', function () {
  const hasContent = Boolean(this.content && this.content.trim());
  const hasAttachment = Boolean(
    this.attachment && this.attachment.filename
  );

  if (!hasContent && !hasAttachment && !this.isDeleted) {
    this.invalidate(
      'content',
      'A message must contain text or an attachment'
    );
  }
});


// ─────────────────────────────────────────────
// DATABASE INDEXES
// ─────────────────────────────────────────────

// Load messages in chronological order.
messageSchema.index(
  { conversationId: 1, createdAt: -1, _id: -1 },
  {
    name: 'message_conversation_date'
  }
);

// Find messages sent by a particular user.
messageSchema.index(
  { senderId: 1, createdAt: -1 },
  {
    name: 'message_sender_date'
  }
);


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = mongoose.model(
  'Message',
  messageSchema
);

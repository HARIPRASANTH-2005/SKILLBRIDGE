// ─────────────────────────────────────────────
//  models/Project.js  —  Project / Opportunity Schema
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'completed'],
    default: 'todo'
  },
  dueDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

const proposalSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentRoll: {
    type: String,
    required: true
  },
  pitch: {
    type: String,
    required: [true, 'Technical approach pitch is required'],
    trim: true
  },
  hoursPerWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 60
  },
  targetWeeks: {
    type: Number,
    default: 4
  },
  repoUrl: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const projectSchema = new mongoose.Schema({
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
    trim: true
  },
  category: {
    type: String,
    enum: ['web', 'cloud', 'mobile', 'data', 'systems', 'ai', 'general'],
    default: 'web'
  },
  skills: {
    type: [String],
    default: []
  },
  duration: {
    type: String,
    default: '4 Weeks'
  },
  deadline: {
    type: Date,
    default: null
  },
  maxStudents: {
    type: Number,
    default: 1
  },
  cadence: {
    type: String,
    default: 'weekly'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'archived'],
    default: 'open'
  },
  // Alumni Creator Reference
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  creatorBatch: {
    type: String,
    default: ''
  },
  creatorCompany: {
    type: String,
    default: ''
  },
  creatorProfession: {
    type: String,
    default: ''
  },
  tasks: [taskSchema],
  proposals: [proposalSchema]
}, {
  timestamps: true
});

projectSchema.index({ title: 'text', description: 'text', skills: 'text' });
projectSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);


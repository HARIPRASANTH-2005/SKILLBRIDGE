// ─────────────────────────────────────────────
//  models/User.js  —  User Schema (Student, Alumni, Admin)
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const verificationReviewSchema = new mongoose.Schema({
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerName: {
    type: String,
    required: true
  },
  decision: {
    type: String,
    enum: ['approved', 'rejected'],
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name as recorded in academic documents is required'],
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8
  },
  mobile: {
    type: String,
    trim: true,
    default: ''
  },
  role: {
    type: String,
    enum: ['student', 'alumni', 'admin'],
    required: true,
    default: 'student'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    required: true,
    default: 'pending'
  },
  // Rejection details if status is rejected
  rejectionReason: {
    type: String,
    default: ''
  },
  // MCA Roll Number — mandatory for both Student and Alumni
  rollNumber: {
    type: String,
    required: [true, 'Official MCA roll number is mandatory'],
    trim: true,
    uppercase: true
  },
  // Academic fields (Current MCA Student)
  currentYear: {
    type: String,
    enum: ['1', '2'],
    default: null
  },
  admissionBatch: {
    type: String,
    trim: true,
    default: ''
  },
  expectedGradYear: {
    type: String,
    trim: true,
    default: ''
  },
  // Professional fields (MCA Alumni)
  graduationYear: {
    type: String,
    trim: true,
    default: ''
  },
  profession: {
    type: String,
    trim: true,
    default: ''
  },
  company: {
    type: String,
    trim: true,
    default: ''
  },
  linkedin: {
    type: String,
    trim: true,
    default: ''
  },
  // Skills inventory
  skills: {
    type: [String],
    default: []
  },
  // Secure Document Storage
  documentFilename: {
    type: String,
    default: ''
  },
  documentOriginalName: {
    type: String,
    default: ''
  },
  documentMimeType: {
    type: String,
    default: ''
  },
  documentSizeBytes: {
    type: Number,
    default: 0
  },
  // Audit review history
  verificationHistory: [verificationReviewSchema]
}, {
  timestamps: true
});

// Index rollNumber and email for fast lookups
userSchema.index({ email: 1 });
userSchema.index({ rollNumber: 1, role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);


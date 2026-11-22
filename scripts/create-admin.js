








// new changes

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI;
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD || '';
  const fullName = (
    process.env.ADMIN_NAME ||
    'Department Platform Administrator'
  ).trim();

  // 1. Validate environment configuration
  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured.');
  }

  if (!email || !isValidEmail(email)) {
    throw new Error('A valid ADMIN_EMAIL must be configured.');
  }

  if (rawPassword.length < 12) {
    throw new Error(
      'ADMIN_PASSWORD must contain at least 12 characters.'
    );
  }

  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error('ADMIN_NAME must contain 2–120 characters.');
  }

  try {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      ...(process.env.DB_NAME
        ? { dbName: process.env.DB_NAME }
        : {})
    });

    console.log('Connected to MongoDB.');

    // 2. Enforce one-time administrator bootstrap
    const existingAdmin = await User.exists({
      role: 'admin'
    });

    if (existingAdmin) {
      throw new Error(
        'An administrator already exists. Bootstrap has been refused.'
      );
    }

    // 3. Never promote an existing student/alumni account
    const existingAccount = await User.findOne({
      email
    }).select('_id role');

    if (existingAccount) {
      throw new Error(
        `This email already belongs to an existing ${existingAccount.role} account. Choose another administrator email.`
      );
    }

    // 4. Hash the administrator password
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // 5. Create a new administrator
    const adminUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'approved',
      rejectionReason: '',
      skills: [
        'System Administration',
        'Academic Verification',
        'MCA Coordination'
      ]
    });

    await adminUser.save();

    console.log('\n--------------------------------------------');
    console.log('Administrator created successfully.');
    console.log('--------------------------------------------');
    console.log(`Name:   ${adminUser.fullName}`);
    console.log(`Email:  ${adminUser.email}`);
    console.log(`Role:   ${adminUser.role}`);
    console.log(`Status: ${adminUser.status}`);
    console.log('Password: Configured securely');
    console.log('--------------------------------------------');
    console.log('Sign in through the shared /login page.');

  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createAdmin().catch(error => {
  console.error('\nAdministrator bootstrap failed:');
  console.error(error.message);
  process.exitCode = 1;
});

// ─────────────────────────────────────────────
//  scripts/create-admin.js  —  CLI Seed for Platform Administrator
// ─────────────────────────────────────────────
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI is not set in environment or .env file.');
    process.exit(1);
  }

  // Parse command line arguments or fall back to env / defaults
  const args = process.argv.slice(2);
  const getArg = (key, defaultVal) => {
    const idx = args.indexOf(`--${key}`);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return defaultVal;
  };

  const email = getArg('email', process.env.ADMIN_EMAIL || 'admin@psgtech.ac.in').toLowerCase().trim();
  const rawPassword = getArg('password', process.env.ADMIN_PASSWORD || 'Admin@PSG2025');
  const fullName = getArg('name', process.env.ADMIN_NAME || 'Department Platform Administrator').trim();
  const rollNumber = getArg('roll', process.env.ADMIN_ROLL || 'ADMIN-01').trim().toUpperCase();

  if (!email || !rawPassword || rawPassword.length < 8) {
    console.error('❌ Error: Admin password must be at least 8 characters.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log('Connected to MongoDB.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const adminUser = await User.findOneAndUpdate(
      { email },
      {
        fullName,
        email,
        password: hashedPassword,
        rollNumber,
        role: 'admin',
        status: 'approved',
        rejectionReason: '',
        skills: ['System Administration', 'Academic Verification', 'MCA Coordination']
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('----------------------------------------------------');
    console.log('✅  Platform Administrator initialized successfully:');
    console.log(`    User ID:     ${adminUser._id}`);
    console.log(`    Name:        ${adminUser.fullName}`);
    console.log(`    Email:       ${adminUser.email}`);
    console.log(`    Roll/ID:     ${adminUser.rollNumber}`);
    console.log(`    Role:        ${adminUser.role}`);
    console.log(`    Status:      ${adminUser.status}`);
    console.log('    Password:    [CONFIGURED]');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Failed to initialize administrator:', err.message);
    process.exit(1);
  }
}

createAdmin();


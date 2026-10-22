const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const createAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@login.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin';

    if (!adminPassword) {
      console.warn('ADMIN_PASSWORD is not set. Skipping automatic admin user creation.');
      process.exit(0);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: adminEmail }).select('+password');

    if (adminExists) {
      try {
        const isValid = await adminExists.comparePassword(adminPassword);
        let changed = false;
        if (!isValid) {
          adminExists.password = adminPassword;
          changed = true;
        } else {
          console.log('Admin user already exists with valid credentials');
        }
        if (!adminExists.emailVerified) {
          adminExists.emailVerified = true;
          changed = true;
        }
        if (changed) await adminExists.save();
        if (!isValid) console.log('Admin password synchronized from ADMIN_PASSWORD');
      } catch (error) {
        console.error('Error verifying existing admin password:', error);
        adminExists.password = adminPassword;
        await adminExists.save();
        console.log('Admin password synchronized after verification error');
      }

      process.exit(0);
    }

    const admin = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      phone: '0000000000',
      role: 'admin',
      isVerified: true,
      emailVerified: true,
      kycStatus: 'approved',
    });

    await admin.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();

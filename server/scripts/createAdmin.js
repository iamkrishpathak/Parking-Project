const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@login.com' }).select('+password');

    if (adminExists) {
      try {
        const isValid = await adminExists.comparePassword('parkbandhu');
        if (!isValid) {
          adminExists.password = 'parkbandhu';
          await adminExists.save();
          console.log('Admin password reset to default credentials');
        } else {
          console.log('Admin user already exists with valid credentials');
        }
      } catch (error) {
        console.error('Error verifying existing admin password:', error);
        adminExists.password = 'parkbandhu';
        await adminExists.save();
        console.log('Admin password reset after verification error');
      }

      process.exit(0);
    }

    const admin = new User({
      name: 'Admin',
      email: 'admin@login.com',
      password: 'parkbandhu',
      phone: '0000000000',
      role: 'admin',
      isVerified: true,
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

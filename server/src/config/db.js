const mongoose = require('mongoose');

const connectDB = async (uri) => {
  try {
    if (!uri) {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI.');
    }

    await mongoose.connect(uri, {
      autoIndex: true,
    });

    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;


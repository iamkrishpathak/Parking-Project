const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      required: false,
    },
    role: {
      type: String,
      enum: ['driver', 'host', 'admin'],
      default: 'driver',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    kycDocuments: [{
      type: {
        type: String,
        enum: ['aadhar', 'pan', 'driving_license', 'other'],
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    parkingSpaces: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
    }],
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India',
      },
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: true },
  }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);


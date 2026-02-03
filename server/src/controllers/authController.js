const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET missing, falling back to insecure development secret');
    return 'secret123';
  }
  return process.env.JWT_SECRET;
};

const signToken = (userId) => jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' });

const sanitizeUser = (user) => {
  const { password, __v, ...rest } = user.toObject();
  return rest;
};

exports.register = async (req, res) => {
  try {
    console.log('Registering user:', req.body);
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const roleLower = role ? role.toLowerCase() : 'driver';

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: roleLower,
    });
    const token = signToken(user._id);

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Register Error:', error);

    // Handle common Mongoose / MongoDB errors more gracefully
    if (error?.code === 11000) {
      // duplicate key (e.g., unique email)
      return res.status(400).json({ message: 'User already exists' });
    }

    if (error?.name === 'ValidationError') {
      const firstKey = Object.keys(error.errors)[0];
      const validationMsg =
        error.errors[firstKey]?.message || 'Invalid data provided';
      return res.status(400).json({ message: validationMsg });
    }

    // For development, surface the actual error message to help debugging
    return res
      .status(500)
      .json({ message: error?.message || 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      console.log('Login failed: missing email or password');
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('Login failed: user not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login failed: password mismatch for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    console.log('Login successful for user:', user._id, 'email:', email);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Login error', error.message);
    res.status(500).json({ message: 'Login failed' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    
    // If email is being changed, check if it's already taken
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateData.email = email.toLowerCase().trim();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Update profile error', error.message);
    res.status(500).json({ message: 'Unable to update profile' });
  }
};

exports.uploadKycFiles = (req, res, next) => {
  try {
    // This middleware should handle file uploads using multer or similar
    // For now, we'll just pass control to the next middleware
    next();
  } catch (error) {
    console.error('Error uploading KYC files:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
};

exports.uploadKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const { files } = req;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Update user's KYC status to 'pending'
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        kycStatus: 'pending',
        kycFiles: files.map(file => ({
          url: file.path,
          type: file.mimetype,
          originalName: file.originalname
        }))
      },
      { new: true }
    );

    res.status(200).json({ 
      message: 'KYC documents uploaded successfully',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('Error in uploadKYC:', error);
    res.status(500).json({ message: 'Error processing KYC upload' });
  }
};

// KYC Management Functions
exports.getPendingKYC = async (req, res) => {
  try {
    const pendingUsers = await User.find({ kycStatus: 'pending' })
      .select('-password -__v');
    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending KYC:', error);
    res.status(500).json({ message: 'Error fetching pending KYC requests' });
  }
};

exports.updateKYCStatus = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be either "approved" or "rejected"' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      kycId,
      { kycStatus: status },
      { new: true }
    ).select('-password -__v');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: `KYC status updated to ${status}`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating KYC status:', error);
    res.status(500).json({ message: 'Error updating KYC status' });
  }
};

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { 
  sendKYCSubmittedNotificationToAdmin,
  sendKYCApprovedEmail,
  sendKYCRejectedEmail,
  sendDocumentRequestEmail,
  sendPasswordResetEmail,
} = require('../utils/emailService');

const googleAuthClient = new OAuth2Client();

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET missing, falling back to insecure development secret');
    return 'secret123';
  }
  return process.env.JWT_SECRET;
};

const signToken = (userId) => jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' });

const getPublicFileUrl = (req, filename) => {
  const baseUrl = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
  return new URL(`/uploads/${filename}`, baseUrl).toString();
};

const sanitizeUser = (user) => {
  const {
    password,
    googleId,
    passwordResetToken,
    passwordResetExpires,
    passwordResetRequestedAt,
    __v,
    ...rest
  } = user.toObject();
  return rest;
};

exports.register = async (req, res) => {
  try {
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

exports.googleLogin = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Google sign-in is not configured on the server' });
  }

  const { credential, role } = req.body || {};
  if (typeof credential !== 'string' || !credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }

  try {
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const profile = ticket.getPayload();

    if (!profile?.sub || !profile.email || profile.email_verified !== true) {
      return res.status(401).json({ message: 'Google did not provide a verified email address' });
    }

    const email = profile.email.trim().toLowerCase();
    let user = await User.findOne({ googleId: profile.sub });

    if (!user) {
      user = await User.findOne({ email }).select('+googleId');

      if (user) {
        if (user.googleId && user.googleId !== profile.sub) {
          return res.status(409).json({ message: 'This email is linked to a different Google account' });
        }

        user.googleId = profile.sub;
        user.isVerified = true;
        await user.save();
      } else {
        const requestedRole = ['driver', 'host'].includes(role) ? role : 'driver';
        user = await User.create({
          name: profile.name || email.split('@')[0],
          email,
          password: crypto.randomBytes(32).toString('hex'),
          googleId: profile.sub,
          authProvider: 'google',
          isVerified: true,
          role: requestedRole,
        });
      }
    }

    return res.json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An account with this Google email already exists. Try signing in again.' });
    }
    console.error('Google sign-in error:', error.message);
    return res.status(401).json({ message: 'Google sign-in could not be verified' });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const genericMessage = 'If an account exists for that email, we sent a password reset link.';

  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('+passwordResetRequestedAt');
    const resetEmailCooldownMs = 60 * 1000;
    const canSendResetEmail = user && (
      !user.passwordResetRequestedAt ||
      Date.now() - user.passwordResetRequestedAt.getTime() >= resetEmailCooldownMs
    );

    if (canSendResetEmail) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      user.passwordResetRequestedAt = new Date();
      await user.save();

      const resetUrl = new URL('/reset-password', process.env.CLIENT_URL || 'http://localhost:3000');
      resetUrl.searchParams.set('token', resetToken);

      try {
        await sendPasswordResetEmail(user.email, user.name, resetUrl.toString());
      } catch (emailError) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetRequestedAt = undefined;
        await user.save();
        console.error('Failed to send password reset email:', emailError.message);
      }
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Password reset request error:', error.message);
    return res.status(500).json({ message: 'Unable to process the password reset request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || !token || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'A valid reset link and a password of at least 8 characters are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'This password reset link is invalid or has expired. Request a new one.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetRequestedAt = undefined;
    await user.save();

    return res.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error.message);
    return res.status(500).json({ message: 'Unable to reset the password' });
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
    const userId = req.user._id;
    const { files } = req;
    
    if (!files || !files.identityProof || !files.addressProof) {
      return res.status(400).json({ 
        success: false,
        message: 'Both identity proof and address proof are required' 
      });
    }

    const identityFile = files.identityProof[0];
    const addressFile = files.addressProof[0];

    // Store file paths in database
    const kycDocuments = [
      {
        type: 'aadhar',
        url: getPublicFileUrl(req, identityFile.filename),
        filename: identityFile.filename,
        originalName: identityFile.originalname,
        mimeType: identityFile.mimetype,
        uploadedAt: new Date(),
      },
      {
        type: 'other',
        url: getPublicFileUrl(req, addressFile.filename),
        filename: addressFile.filename,
        originalName: addressFile.originalname,
        mimeType: addressFile.mimetype,
        uploadedAt: new Date(),
      }
    ];

    // Update user's KYC status to 'pending'
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        kycStatus: 'pending',
        kycDocuments: kycDocuments,
        $set: { kycSubmittedAt: new Date() }
      },
      { new: true }
    );

    // Send email notification to admin
    try {
      await sendKYCSubmittedNotificationToAdmin(updatedUser.name, updatedUser.email, updatedUser.role);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError.message);
      // Don't fail the upload if email fails
    }

    res.status(200).json({ 
      success: true,
      message: 'KYC documents uploaded successfully. Your submission is now pending verification.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('Error in uploadKYC:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error processing KYC upload' 
    });
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
    const { status, rejectionReason } = req.body;

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

    // Send appropriate email based on status
    try {
      if (status === 'approved') {
        await sendKYCApprovedEmail(updatedUser.email, updatedUser.name);
      } else if (status === 'rejected') {
        await sendKYCRejectedEmail(
          updatedUser.email, 
          updatedUser.name, 
          rejectionReason || 'Your KYC documents did not meet our requirements.'
        );
      }
    } catch (emailError) {
      console.error('Failed to send status email:', emailError.message);
      // Continue even if email fails
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

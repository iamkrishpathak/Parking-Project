const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    return 'secret123';
  }
  return process.env.JWT_SECRET;
};

// Admin-only middleware with additional security
const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.warn(`Unauthorized admin access attempt by user ${user._id} with role ${user.role}`);
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Log admin actions
    console.log(`Admin action: ${req.method} ${req.path} by ${user._id}`);

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = adminMiddleware;

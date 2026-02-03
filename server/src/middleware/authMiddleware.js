const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

      if (!token) {
        console.log('Auth failed: no token provided');
        return res.status(401).json({ message: 'Authorization token missing' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        console.log('Auth failed: user not found for id:', decoded.id);
        return res.status(401).json({ message: 'User not found' });
      }

      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        console.log('Auth failed: user role', user.role, 'not in allowed roles', allowedRoles);
        return res.status(403).json({ message: 'Access forbidden for role' });
      }

      console.log('Auth successful for user:', user._id, 'role:', user.role);
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth error', error.message);
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
};

module.exports = authMiddleware;


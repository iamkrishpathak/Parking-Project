const requireVerifiedEmail = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.emailVerified === true) return next();
  return res.status(403).json({
    code: 'EMAIL_VERIFICATION_REQUIRED',
    message: 'Verify your email address before booking or managing parking listings.',
  });
};

module.exports = requireVerifiedEmail;

/**
 * Must run after authMiddleware. Allows access only for admin role.
 */
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
  });
};

module.exports = { adminMiddleware };


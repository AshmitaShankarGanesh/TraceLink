const jwt = require('jsonwebtoken');

/**
 * Creates a signed JWT for the given user (id + role).
 */
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { generateToken };


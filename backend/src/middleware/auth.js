
const jwt = require('jsonwebtoken');

// Verify user authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

// Verify user role
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userRole = String(req.user.role || '').toLowerCase();

    const permittedRoles = allowedRoles.map(role =>
      role.toLowerCase()
    );

    if (!permittedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission.'
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};

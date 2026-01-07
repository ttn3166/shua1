const { verifyToken } = require('./auth');
const { hasPermission } = require('./permissions');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { requireAuth, requirePermission };

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026_sebi_compliant_secure_token';

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
}

module.exports = authMiddleware;

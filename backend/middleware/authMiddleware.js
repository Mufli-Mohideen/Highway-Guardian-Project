const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  console.log('Auth middleware accessed:', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!req.headers['authorization']
  });

  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    console.log('Token missing in request');
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  try {
    console.log('Attempting to verify token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully for admin:', decoded.id);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };

const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.userId = payload.sub;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'Invalid token';
    return res.status(401).json({ error: message });
  }
};

module.exports = { authenticate };

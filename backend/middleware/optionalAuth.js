import jwt from 'jsonwebtoken';

const optionalAuth = (req, _res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.log('Optional auth skipped:', error.message);
  }

  next();
};

export default optionalAuth;
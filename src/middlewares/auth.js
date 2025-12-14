import createError from 'http-errors';
import { verifyAccessToken } from '../utils/jwt.js';

export default function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      if (required) return next(createError(401, 'Authorization header missing'));
      req.user = null;
      return next();
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(createError(401, 'Invalid Authorization header format'));
    }

    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email };
      return next();
    } catch (err) {
      return next(createError(401, 'Invalid or expired token'));
    }
  };
}

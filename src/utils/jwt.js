import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, {
    issuer: 'insta-community',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

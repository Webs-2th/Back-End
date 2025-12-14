import crypto from 'crypto';
import createError from 'http-errors';
import pool from '../db/pool.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { sendEmail, buildVerificationEmail } from '../utils/email.js';

export async function registerUser({ email, password, nickname }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingEmail] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingEmail.length) throw createError(409, 'Email already in use');

    const [existingNickname] = await connection.query('SELECT id FROM users WHERE nickname = ? LIMIT 1', [nickname]);
    if (existingNickname.length) throw createError(409, 'Nickname already in use');

    const passwordHash = await hashPassword(password);
    const [userResult] = await connection.query(
      `INSERT INTO users (email, password_hash, nickname, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [email, passwordHash, nickname]
    );

    const userId = userResult.insertId;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await connection.query(
      `INSERT INTO email_verifications (user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, token, expires]
    );

    await connection.commit();

    const emailPayload = buildVerificationEmail({ token });
    sendEmail({ to: email, ...emailPayload }).catch((err) => {
      console.error('Failed to send verification email', err.message);
    });

    return { userId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function verifyEmailToken({ token }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT ev.id, ev.user_id, ev.expires_at, ev.used_at
       FROM email_verifications ev
       WHERE ev.token = ?
       FOR UPDATE`,
      [token]
    );

    if (!rows.length) throw createError(400, 'Invalid token');
    const record = rows[0];

    if (record.used_at) throw createError(409, 'Token already used');
    if (new Date(record.expires_at) < new Date()) throw createError(400, 'Token expired');

    await connection.query('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = ?', [record.user_id]);
    await connection.query('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [record.id]);

    await connection.commit();
    return { userId: record.user_id };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function loginUser({ email, password }) {
  const [rows] = await pool.query(
    `SELECT id, email, password_hash, nickname, email_verified_at
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  if (!rows.length) throw createError(401, 'Invalid email or password');
  const user = rows[0];

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw createError(401, 'Invalid email or password');

  if (!user.email_verified_at) throw createError(403, 'Email not verified');

  const token = signAccessToken({ sub: user.id, email: user.email });
  return {
    accessToken: token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      emailVerifiedAt: user.email_verified_at,
    },
  };
}

export async function getMe(userId) {
  const [rows] = await pool.query(
    `SELECT id, email, nickname, profile_image_url, bio, email_verified_at, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) throw createError(404, 'User not found');
  return rows[0];
}

export async function updateProfile(userId, payload) {
  const fields = [];
  const values = [];

  const mapping = {
    nickname: 'nickname',
    bio: 'bio',
    profileImageUrl: 'profile_image_url',
  };

  for (const [key, column] of Object.entries(mapping)) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(payload[key]);
    }
  }

  if (!fields.length) return getMe(userId);

  values.push(userId);

  await pool.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
  return getMe(userId);
}

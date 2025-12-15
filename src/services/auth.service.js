import createError from "http-errors";
import pool from "../db/pool.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";

// Email verification flow disabled: register no longer issues tokens and login does not require verification.
export async function registerUser({ email, password, nickname }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingEmail] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingEmail.length) throw createError(409, "Email already in use");

    const [existingNickname] = await connection.query("SELECT id FROM users WHERE nickname = ? LIMIT 1", [nickname]);
    if (existingNickname.length) throw createError(409, "Nickname already in use");

    const passwordHash = await hashPassword(password);
    const [userResult] = await connection.query(
      `INSERT INTO users (email, password_hash, nickname, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [email, passwordHash, nickname]
    );

    await connection.commit();

    return { userId: userResult.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function verifyEmailToken() {
  // Verification is disabled; keep the endpoint but signal deprecation.
  throw createError(410, "Email verification disabled");
}

export async function loginUser({ email, password }) {
  const [rows] = await pool.query(
    `SELECT id, email, password_hash, nickname, email_verified_at
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  if (!rows.length) throw createError(401, "Invalid email or password");
  const user = rows[0];

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw createError(401, "Invalid email or password");

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
  if (!rows.length) throw createError(404, "User not found");
  return rows[0];
}

export async function updateProfile(userId, payload) {
  const fields = [];
  const values = [];

  const mapping = {
    nickname: "nickname",
    bio: "bio",
    profileImageUrl: "profile_image_url",
  };

  for (const [key, column] of Object.entries(mapping)) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(payload[key]);
    }
  }

  if (!fields.length) return getMe(userId);

  values.push(userId);

  await pool.query(`UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
  return getMe(userId);
}

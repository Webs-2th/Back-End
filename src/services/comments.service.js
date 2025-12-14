import createError from 'http-errors';
import pool from '../db/pool.js';

function decodeCursor(cursor) {
  if (!cursor) return null;
  const [ts, id] = cursor.split('_');
  return { ts, id: Number(id) };
}

function encodeCursor(row) {
  return row ? row.created_at.toISOString() + '_' + row.id : null;
}

export async function listComments({ postId, cursor, limit }) {
  const where = ['c.post_id = ?', 'c.deleted_at IS NULL'];
  const params = [postId];
  const cursorData = decodeCursor(cursor);
  if (cursorData) {
    where.push('(c.created_at < ? OR (c.created_at = ? AND c.id < ?))');
    params.push(cursorData.ts, cursorData.ts, cursorData.id);
  }

  const sql = `
    SELECT c.id, c.content, c.created_at, c.updated_at,
           u.id AS user_id, u.nickname, u.profile_image_url
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ?`;

  const [rows] = await pool.query(sql, [...params, limit + 1]);
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasNext ? encodeCursor(items[items.length - 1]) : null };
}

export async function createComment({ postId, userId, content }) {
  const [postRows] = await pool.query('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
  if (!postRows.length) throw createError(404, 'Post not found');

  const [result] = await pool.query(
    `INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [postId, userId, content]
  );

  const [rows] = await pool.query(
    `SELECT c.id, c.content, c.created_at, u.nickname, u.profile_image_url
     FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    [result.insertId]
  );
  return rows[0];
}

export async function updateComment({ commentId, userId, content }) {
  const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ? AND deleted_at IS NULL', [commentId]);
  if (!rows.length) throw createError(404, 'Comment not found');
  if (rows[0].user_id !== userId) throw createError(403, 'Not allowed');

  await pool.query('UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?', [content, commentId]);
}

export async function deleteComment({ commentId, userId }) {
  const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ? AND deleted_at IS NULL', [commentId]);
  if (!rows.length) throw createError(404, 'Comment not found');
  if (rows[0].user_id !== userId) throw createError(403, 'Not allowed');

  await pool.query('UPDATE comments SET deleted_at = NOW() WHERE id = ?', [commentId]);
}

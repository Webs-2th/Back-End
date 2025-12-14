import pool from '../db/pool.js';
import { parseCursorPagination } from '../utils/pagination.js';
import * as postsService from './posts.service.js';
import * as authService from './auth.service.js';

function decodeCursor(cursor) {
  if (!cursor) return null;
  const [ts, id] = cursor.split('_');
  return { ts, id: Number(id) };
}

export async function getProfile(userId) {
  return authService.getMe(userId);
}

export async function updateProfile(userId, payload) {
  return authService.updateProfile(userId, payload);
}

export async function getMyPosts(userId, query) {
  const { cursor, limit } = parseCursorPagination(query);
  return postsService.listPosts({ filters: { userId }, cursor, limit });
}

export async function getMyComments(userId, query) {
  const { cursor, limit } = parseCursorPagination(query);
  const where = ['c.user_id = ?', 'c.deleted_at IS NULL'];
  const params = [userId];
  const cursorData = decodeCursor(cursor);
  if (cursorData) {
    where.push('(c.created_at < ? OR (c.created_at = ? AND c.id < ?))');
    params.push(cursorData.ts, cursorData.ts, cursorData.id);
  }

  const sql = `
    SELECT c.id, c.content, c.created_at, c.updated_at,
           p.id AS post_id, p.title
    FROM comments c
    JOIN posts p ON p.id = c.post_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ?`;

  const [rows] = await pool.query(sql, [...params, limit + 1]);
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const tail = items[items.length - 1];
  const nextCursor = hasNext && tail ? tail.created_at.toISOString() + '_' + tail.id : null;
  return { items, nextCursor };
}

export async function getCommentedPosts(userId, query) {
  const { cursor, limit } = parseCursorPagination(query);
  const cursorData = decodeCursor(cursor);
  const params = [userId];
  let havingClause = '';
  if (cursorData) {
    havingClause = 'HAVING (last_commented_at < ? OR (last_commented_at = ? AND p.id < ?))';
    params.push(cursorData.ts, cursorData.ts, cursorData.id);
  }

  const sql = `
    SELECT p.id, p.title, p.body, p.published_at, MAX(c.created_at) AS last_commented_at
    FROM comments c
    JOIN posts p ON p.id = c.post_id
    WHERE c.user_id = ? AND c.deleted_at IS NULL
    GROUP BY p.id
    ${havingClause}
    ORDER BY last_commented_at DESC, p.id DESC
    LIMIT ?`;

  const [rows] = await pool.query(sql, [...params, limit + 1]);
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const tail = items[items.length - 1];
  const nextCursor = hasNext && tail ? tail.last_commented_at.toISOString() + '_' + tail.id : null;
  return { items, nextCursor };
}

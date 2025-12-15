import createError from 'http-errors';
import pool from '../db/pool.js';

function decodeCursor(cursor) {
  if (!cursor) return null;
  const [ts, id] = cursor.split('_');
  return { ts, id: Number(id) };
}

function encodeCursor(row) {
  return row ? row.published_at.toISOString() + '_' + row.id : null;
}

export async function listPosts({ filters = {}, cursor, limit }) {
  const whereClauses = ['p.deleted_at IS NULL'];
  const params = [];

  if (filters.userId) {
    whereClauses.push('p.user_id = ?');
    params.push(filters.userId);
  }

  if (filters.tag) {
    whereClauses.push('t.name = ?');
    params.push(filters.tag);
  }

  if (filters.place) {
    whereClauses.push('p.place = ?');
    params.push(filters.place);
  }

  const cursorData = decodeCursor(cursor);
  if (cursorData) {
    whereClauses.push('(p.published_at < ? OR (p.published_at = ? AND p.id < ?))');
    params.push(cursorData.ts, cursorData.ts, cursorData.id);
  }

  const sql = `
    SELECT p.id, p.user_id, p.title, p.body, p.place, p.published_at, p.created_at,
           u.nickname, u.profile_image_url,
           JSON_ARRAYAGG(JSON_OBJECT('url', pi.image_url, 'sort', pi.sort_order)) AS images,
           GROUP_CONCAT(DISTINCT t.name) AS tags,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
           (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count
    FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN post_images pi ON pi.post_id = p.id
      LEFT JOIN post_tags pt ON pt.post_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY p.id
    ORDER BY p.published_at DESC, p.id DESC
    LIMIT ?`;

  const [rows] = await pool.query(sql, [...params, limit + 1]);
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? encodeCursor(items[items.length - 1]) : null;

  return { items, nextCursor };
}

export async function getPost(postId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.user_id, p.title, p.body, p.place, p.published_at, p.created_at, p.updated_at,
            u.nickname, u.profile_image_url,
            JSON_ARRAYAGG(JSON_OBJECT('url', pi.image_url, 'sort', pi.sort_order)) AS images,
            GROUP_CONCAT(DISTINCT t.name) AS tags,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN post_images pi ON pi.post_id = p.id
       LEFT JOIN post_tags pt ON pt.post_id = p.id
       LEFT JOIN tags t ON t.id = pt.tag_id
       WHERE p.id = ? AND p.deleted_at IS NULL
       GROUP BY p.id`,
    [postId]
  );

  if (!rows.length) throw createError(404, 'Post not found');
  return rows[0];
}

async function insertImages(connection, postId, images) {
  if (!images?.length) return;
  const values = images.map((img, idx) => [postId, img.imageUrl || img, idx]);
  await connection.query('INSERT INTO post_images (post_id, image_url, sort_order) VALUES ?', [values]);
}

async function insertTags(connection, postId, tags) {
  if (!tags?.length) return;
  for (const tag of tags) {
    await connection.query('INSERT IGNORE INTO tags (name) VALUES (?)', [tag]);
    await connection.query(
      `INSERT INTO post_tags (post_id, tag_id)
         SELECT ?, id FROM tags WHERE name = ?
         ON DUPLICATE KEY UPDATE tag_id = tag_id`,
      [postId, tag]
    );
  }
}

export async function createPost({ userId, title, body, place, publishedAt, images = [], tags = [] }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO posts (user_id, title, body, place, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, title, body, place || null, publishedAt || new Date()]
    );

    const postId = result.insertId;
    await insertImages(connection, postId, images);
    await insertTags(connection, postId, tags);

    await connection.commit();
    return getPost(postId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function updatePost({ postId, userId, data }) {
  const [rows] = await pool.query('SELECT user_id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
  if (!rows.length) throw createError(404, 'Post not found');
  if (rows[0].user_id !== userId) throw createError(403, 'Not allowed');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE posts SET title = ?, body = ?, place = ?, published_at = COALESCE(?, published_at), updated_at = NOW()
       WHERE id = ?`,
      [data.title, data.body, data.place || null, data.publishedAt || null, postId]
    );

    await connection.query('DELETE FROM post_images WHERE post_id = ?', [postId]);
    await insertImages(connection, postId, data.images);

    await connection.query('DELETE FROM post_tags WHERE post_id = ?', [postId]);
    await insertTags(connection, postId, data.tags);

    await connection.commit();
    return getPost(postId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function deletePost({ postId, userId }) {
  const [rows] = await pool.query('SELECT user_id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
  if (!rows.length) throw createError(404, 'Post not found');
  if (rows[0].user_id !== userId) throw createError(403, 'Not allowed');

  await pool.query('UPDATE posts SET deleted_at = NOW() WHERE id = ?', [postId]);
}

export async function toggleLike({ postId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [postRows] = await connection.query('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!postRows.length) throw createError(404, 'Post not found');

    let liked = false;
    try {
      await connection.query('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, NOW())', [
        postId,
        userId,
      ]);
      liked = true;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        await connection.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
        liked = false;
      } else {
        throw err;
      }
    }

    const [countRows] = await connection.query('SELECT COUNT(*) AS cnt FROM post_likes WHERE post_id = ?', [postId]);
    await connection.commit();
    return { liked, likesCount: Number(countRows[0].cnt) };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

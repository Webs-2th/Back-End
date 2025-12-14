const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parseCursorPagination(query) {
  const limit = Math.min(Number(query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = query.cursor || null;
  return { cursor, limit };
}

export function encodeCursor(row, fields) {
  if (!row) return null;
  const parts = fields.map((field) => row[field]);
  return parts.join('_');
}

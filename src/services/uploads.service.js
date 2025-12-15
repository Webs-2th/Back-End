import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getUploadsDir } from '../utils/uploads.js';

function resolveUploadBaseUrl() {
  const base =
    process.env.UPLOAD_BASE_URL ||
    process.env.APP_BASE_URL ||
    `http://localhost:${process.env.PORT || 4000}`;
  return base.replace(/\/$/, '');
}

export async function processImageUpload(file) {
  if (!file) throw new Error('No file uploaded');

  const uploadsDir = getUploadsDir();
  const ext = path.extname(file.originalname || '');
  const filename = crypto.randomUUID() + ext;
  const filePath = path.join(uploadsDir, filename);
  await fs.writeFile(filePath, file.buffer);

  const url = resolveUploadBaseUrl() + '/uploads/' + filename;
  return { url, size: file.size, mimeType: file.mimetype };
}

import fs from 'fs';
import path from 'path';

const configuredPath = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(process.cwd(), 'uploads');
let ensured = false;

function ensureUploadsDir() {
  if (!ensured) {
    if (!fs.existsSync(configuredPath)) {
      fs.mkdirSync(configuredPath, { recursive: true });
    }
    ensured = true;
  }
  return configuredPath;
}

export function getUploadsDir() {
  return ensureUploadsDir();
}

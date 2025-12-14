export async function processImageUpload(file) {
  if (!file) throw new Error('No file uploaded');
  const base = process.env.UPLOAD_BASE_URL || 'https://cdn.example.com';
  const url = base.replace(/\/$/, '') + '/images/' + file.originalname;
  return { url, size: file.size, mimeType: file.mimetype };
}

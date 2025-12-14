import * as uploadsService from '../services/uploads.service.js';

export async function uploadImage(req, res) {
  const payload = await uploadsService.processImageUpload(req.file);
  res.status(201).json(payload);
}

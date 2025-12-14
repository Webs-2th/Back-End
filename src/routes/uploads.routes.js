import { Router } from 'express';
import multer from 'multer';
import asyncHandler from '../middlewares/asyncHandler.js';
import auth from '../middlewares/auth.js';
import * as controller from '../controllers/uploads.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/images', auth(true), upload.single('image'), asyncHandler(controller.uploadImage));

export default router;

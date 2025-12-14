import { Router } from 'express';
import authRoutes from './auth.routes.js';
import postRoutes from './posts.routes.js';
import commentRoutes from './comments.routes.js';
import userRoutes from './users.routes.js';
import uploadRoutes from './uploads.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);

export default router;

import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import validate from '../middlewares/validate.js';
import auth from '../middlewares/auth.js';
import * as controller from '../controllers/users.controller.js';

const router = Router();

router.get('/me', auth(true), asyncHandler(controller.me));
router.patch('/me', auth(true), validate(controller.validators.update), asyncHandler(controller.updateMe));
router.get('/me/posts', auth(true), asyncHandler(controller.myPosts));
router.get('/me/comments', auth(true), asyncHandler(controller.myComments));
router.get('/me/commented-posts', auth(true), asyncHandler(controller.myCommentedPosts));

export default router;

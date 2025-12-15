import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import validate from '../middlewares/validate.js';
import auth from '../middlewares/auth.js';
import * as postsController from '../controllers/posts.controller.js';
import * as commentsController from '../controllers/comments.controller.js';

const router = Router();

router.get('/', validate(postsController.validators.list), asyncHandler(postsController.list));
router.get('/:postId', asyncHandler(postsController.detail));
router.get('/:postId/comments', asyncHandler(commentsController.listForPost));
router.post(
  '/:postId/comments',
  auth(true),
  validate(commentsController.validators.create),
  asyncHandler(commentsController.createForPost)
);
router.post('/:postId/likes/toggle', auth(true), asyncHandler(postsController.toggleLike));
router.post('/', auth(true), validate(postsController.validators.create), asyncHandler(postsController.create));
router.patch('/:postId', auth(true), validate(postsController.validators.update), asyncHandler(postsController.update));
router.delete('/:postId', auth(true), asyncHandler(postsController.remove));

export default router;

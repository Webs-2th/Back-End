import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import validate from '../middlewares/validate.js';
import auth from '../middlewares/auth.js';
import * as controller from '../controllers/comments.controller.js';

const router = Router();

router.patch('/:commentId', auth(true), validate(controller.validators.update), asyncHandler(controller.update));
router.delete('/:commentId', auth(true), asyncHandler(controller.remove));

export default router;

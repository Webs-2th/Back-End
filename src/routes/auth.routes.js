import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import validate from '../middlewares/validate.js';
import auth from '../middlewares/auth.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validate(controller.validators.register), asyncHandler(controller.register));
router.post('/verify-email', validate(controller.validators.verifyEmail), asyncHandler(controller.verifyEmail));
router.post('/login', validate(controller.validators.login), asyncHandler(controller.login));
router.get('/me', auth(true), asyncHandler(controller.me));

export default router;

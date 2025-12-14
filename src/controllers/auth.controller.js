import { z } from 'zod';
import * as authService from '../services/auth.service.js';

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    nickname: z.string().min(2).max(40),
  }),
});

const verifySchema = z.object({
  body: z.object({
    token: z.string().min(10),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const validators = {
  register: registerSchema,
  verifyEmail: verifySchema,
  login: loginSchema,
};

export async function register(req, res) {
  const { body } = req.validated;
  const result = await authService.registerUser(body);
  res.status(201).json({ userId: result.userId });
}

export async function verifyEmail(req, res) {
  const { body } = req.validated;
  const result = await authService.verifyEmailToken(body);
  res.json({ message: 'Email verified', ...result });
}

export async function login(req, res) {
  const { body } = req.validated;
  const payload = await authService.loginUser(body);
  res.json(payload);
}

export async function me(req, res) {
  const profile = await authService.getMe(req.user.id);
  res.json(profile);
}

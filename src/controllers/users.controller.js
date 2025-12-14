import { z } from 'zod';
import * as usersService from '../services/users.service.js';

const updateSchema = z.object({
  body: z.object({
    nickname: z.string().min(2).max(40).optional(),
    bio: z.string().max(160).optional(),
    profileImageUrl: z.string().url().optional(),
  }),
});

export const validators = {
  update: updateSchema,
};

export async function me(req, res) {
  const profile = await usersService.getProfile(req.user.id);
  res.json(profile);
}

export async function updateMe(req, res) {
  const { body } = req.validated;
  const profile = await usersService.updateProfile(req.user.id, body);
  res.json(profile);
}

export async function myPosts(req, res) {
  const result = await usersService.getMyPosts(req.user.id, req.query);
  res.json(result);
}

export async function myComments(req, res) {
  const result = await usersService.getMyComments(req.user.id, req.query);
  res.json(result);
}

export async function myCommentedPosts(req, res) {
  const result = await usersService.getCommentedPosts(req.user.id, req.query);
  res.json(result);
}

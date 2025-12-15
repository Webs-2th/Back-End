import { z } from 'zod';
import * as postsService from '../services/posts.service.js';
import { parseCursorPagination } from '../utils/pagination.js';

const listSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.string().optional(),
    userId: z.string().optional(),
    tag: z.string().optional(),
    place: z.string().optional(),
  }),
});

const postSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    place: z.string().nullish(),
    publishedAt: z.string().datetime().optional(),
    images: z.array(z.object({ imageUrl: z.string().url() })).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const validators = {
  list: listSchema,
  create: postSchema,
  update: postSchema,
};

export async function list(req, res) {
  const { cursor, limit } = parseCursorPagination(req.query);
  const filters = {
    userId: req.query.userId,
    tag: req.query.tag,
    place: req.query.place,
  };
  const result = await postsService.listPosts({ filters, cursor, limit });
  res.json(result);
}

export async function detail(req, res) {
  const post = await postsService.getPost(req.params.postId);
  res.json(post);
}

export async function create(req, res) {
  const { body } = req.validated;
  const post = await postsService.createPost({
    userId: req.user.id,
    ...body,
  });
  res.status(201).json(post);
}

export async function update(req, res) {
  const { body } = req.validated;
  const post = await postsService.updatePost({
    postId: req.params.postId,
    userId: req.user.id,
    data: body,
  });
  res.json(post);
}

export async function remove(req, res) {
  await postsService.deletePost({ postId: req.params.postId, userId: req.user.id });
  res.status(204).send();
}

export async function toggleLike(req, res) {
  const result = await postsService.toggleLike({ postId: req.params.postId, userId: req.user.id });
  res.json(result);
}

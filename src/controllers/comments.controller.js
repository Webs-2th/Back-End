import { z } from 'zod';
import * as commentsService from '../services/comments.service.js';
import { parseCursorPagination } from '../utils/pagination.js';

const bodySchema = z.object({
  content: z.string().min(1),
});

export const validators = {
  create: z.object({ body: bodySchema }),
  update: z.object({ body: bodySchema }),
};

export async function listForPost(req, res) {
  const { cursor, limit } = parseCursorPagination(req.query);
  const postId = req.params.postId;
  const result = await commentsService.listComments({ postId, cursor, limit });
  res.json(result);
}

export async function createForPost(req, res) {
  const { body } = req.validated;
  const comment = await commentsService.createComment({
    postId: req.params.postId,
    userId: req.user.id,
    content: body.content,
  });
  res.status(201).json(comment);
}

export async function update(req, res) {
  const { body } = req.validated;
  await commentsService.updateComment({
    commentId: req.params.commentId,
    userId: req.user.id,
    content: body.content,
  });
  res.status(204).send();
}

export async function remove(req, res) {
  await commentsService.deleteComment({
    commentId: req.params.commentId,
    userId: req.user.id,
  });
  res.status(204).send();
}

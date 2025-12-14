export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.expose ? err.message : 'Internal Server Error';
  const payload = { message };

  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

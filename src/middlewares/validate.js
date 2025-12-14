import createError from 'http-errors';

export default function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      req.validated = parsed;
      return next();
    } catch (err) {
      const firstError = err?.errors?.[0]?.message || 'Validation failed';
      return next(createError(422, firstError));
    }
  };
}

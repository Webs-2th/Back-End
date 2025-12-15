import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import createError from 'http-errors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import { getUploadsDir } from './utils/uploads.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swaggerDocument = YAML.load(path.resolve(__dirname, '../docs/openapi.yaml'));
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const uploadsDir = getUploadsDir();

// Allow assets (e.g., images) to be loaded from another origin like :3000
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(createError(403, `Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('combined'));
// Serve uploaded files with explicit CORP header and no caching, to avoid stale "same-origin" headers on 304
app.use(
  '/uploads',
  express.static(uploadsDir, {
    etag: false,
    setHeaders(res) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/v1', routes);

app.use((req, res, next) => {
  next(createError(404, 'Route ' + req.path + ' not found'));
});

app.use(errorHandler);

export default app;

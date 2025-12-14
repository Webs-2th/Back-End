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

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swaggerDocument = YAML.load(path.resolve(__dirname, '../docs/openapi.yaml'));
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
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

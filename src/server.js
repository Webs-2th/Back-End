import dotenv from 'dotenv';
import app from './app.js';
import './db/pool.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

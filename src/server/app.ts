import { existsSync } from 'fs';
import path from 'path';
import express, { type Application } from 'express';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fileURLToPath } from 'url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const DIST_DIRECTORY_NAME = 'dist';
const PUBLIC_DIRECTORY_NAME = 'public';
const INDEX_FILE_NAME = 'index.html';
const PUBLIC_DIR = path.join(PROJECT_ROOT, DIST_DIRECTORY_NAME, PUBLIC_DIRECTORY_NAME);
const INDEX_FILE = path.join(PUBLIC_DIR, INDEX_FILE_NAME);

function configureCoreMiddleware(app: Application): void {
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));
}

function configureRoutes(app: Application): void {
  app.use('/api', apiRouter);
}

function attachIndexFallback(app: Application): void {
  app.get('*', (_req, res) => {
    if (!existsSync(INDEX_FILE)) {
      res.status(503).send('Frontend build not available.');
      return;
    }
    res.sendFile(INDEX_FILE);
  });
}

export function createApp(): Application {
  const app = express();
  configureCoreMiddleware(app);
  configureRoutes(app);
  attachIndexFallback(app);
  app.use(errorHandler);
  return app;
}

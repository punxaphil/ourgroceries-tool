import path from 'path';
import express, { type Application } from 'express';
import connectLiveReload from 'connect-livereload';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createLiveReloadController, registerShutdownHooks } from './services/liveReload.js';
import { staticDirectoryPath } from './config/paths.js';
import { getEnvBoolean } from './utils/env.js';

const STATIC_DIR = staticDirectoryPath();
const INDEX_FILE = path.join(STATIC_DIR, 'index.html');

function shouldEnableLiveReload(): boolean {
  return getEnvBoolean('ENABLE_LIVE_RELOAD', process.env.NODE_ENV !== 'production');
}

function attachLiveReload(app: Application): void {
  if (!shouldEnableLiveReload()) return;
  const controller = createLiveReloadController({ paths: [STATIC_DIR] });
  controller.start();
  registerShutdownHooks(controller);
  app.use(connectLiveReload());
  console.info(`[livereload] watching ${STATIC_DIR}`);
}

function configureCoreMiddleware(app: Application): void {
  app.use(express.json());
  app.use(express.static(STATIC_DIR));
}

function configureRoutes(app: Application): void {
  app.use('/api', apiRouter);
}

function attachIndexFallback(app: Application): void {
  app.get('*', (_req, res) => {
    res.sendFile(INDEX_FILE);
  });
}

export function createApp(): Application {
  const app = express();
  attachLiveReload(app);
  configureCoreMiddleware(app);
  configureRoutes(app);
  attachIndexFallback(app);
  app.use(errorHandler);
  return app;
}

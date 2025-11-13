import { createApp } from './server/app.js';
import { getEnvNumber } from './server/utils/env.js';
import { clearOurGroceriesClientCache } from './server/services/ourGroceriesClient.js';

const DEFAULT_PORT = 8000;

function resolvePort(): number {
  return getEnvNumber('PORT', DEFAULT_PORT) ?? DEFAULT_PORT;
}

function shutdown(): void {
  clearOurGroceriesClientCache();
}

function registerShutdown(): void {
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('exit', shutdown);
}

function start(): void {
  const app = createApp();
  const port = resolvePort();
  registerShutdown();
  app.listen(port, () => {
    console.info(`Server is running at http://localhost:${port}`);
  });
}

start();

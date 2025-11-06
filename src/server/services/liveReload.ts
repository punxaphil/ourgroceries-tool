import livereload from 'livereload';

type LiveReloadServer = ReturnType<typeof livereload.createServer>;

export interface LiveReloadOptions {
  paths: string[];
  port?: number;
  verbose?: boolean;
}

export interface LiveReloadController {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

interface LiveReloadState {
  server: LiveReloadServer | null;
  paths: string[];
  port?: number;
  log: (message: string) => void;
}

function normalizePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map((value) => value.trim()))).filter((value) => value.length > 0);
}

function createLogger(verbose?: boolean) {
  return (message: string) => {
    if (verbose) {
      console.info(`[livereload] ${message}`);
    }
  };
}

function createState(options: LiveReloadOptions): LiveReloadState {
  return {
    server: null,
    paths: normalizePaths(options.paths),
    port: options.port,
    log: createLogger(options.verbose),
  };
}

function startLiveReload(state: LiveReloadState): void {
  if (state.server || state.paths.length === 0) {
    return;
  }
  const server = livereload.createServer({ port: state.port });
  state.paths.forEach((pathItem) => server.watch(pathItem));
  state.server = server;
  state.log(`watching ${state.paths.join(', ')}`);
}

function stopLiveReload(state: LiveReloadState): void {
  if (!state.server) {
    return;
  }
  state.server.close();
  state.server = null;
  state.log('stopped');
}

export function createLiveReloadController(options: LiveReloadOptions): LiveReloadController {
  const state = createState(options);
  return {
    start: () => startLiveReload(state),
    stop: () => stopLiveReload(state),
    isRunning: () => state.server !== null,
  };
}

export function registerShutdownHooks(
  controller: LiveReloadController,
  signals: (NodeJS.Signals | 'exit')[] = ['SIGINT', 'SIGTERM', 'exit']
): void {
  signals.forEach((signal) => {
    if (signal === 'exit') {
      process.once('exit', () => controller.stop());
      return;
    }
    process.once(signal, () => controller.stop());
  });
}

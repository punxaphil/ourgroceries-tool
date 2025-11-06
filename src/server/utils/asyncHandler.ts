import { NextFunction, Request, Response } from 'express';
import { ensureHttpError, HttpError } from './httpError.js';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

type ErrorMapper = (error: unknown) => Error;

interface AsyncHandlerOptions {
  mapError?: ErrorMapper;
  onError?: (error: HttpError, req: Request) => void;
}

function resolveError(error: unknown, mapper?: ErrorMapper): HttpError {
  const mapped = mapper ? mapper(error) : ensureHttpError(error, 'Request failed.');
  return ensureHttpError(mapped, 'Request failed.');
}

export function asyncHandler(handler: AsyncRequestHandler, options?: AsyncHandlerOptions) {
  return async function wrapped(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await handler(req, res, next);
    } catch (error) {
      const httpError = resolveError(error, options?.mapError);
      if (options?.onError) options.onError(httpError, req);
      next(httpError);
    }
  };
}

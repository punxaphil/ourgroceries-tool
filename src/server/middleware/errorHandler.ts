import { NextFunction, Request, Response } from 'express';
import { ErrorBody } from '../types.js';
import { ensureHttpError, HttpError } from '../utils/httpError.js';

const INTERNAL_MESSAGE = 'An internal server error occurred.';
const LOG_THRESHOLD = 500;

function resolveError(error: unknown): HttpError {
  return ensureHttpError(error, INTERNAL_MESSAGE, LOG_THRESHOLD);
}

function shouldLog(status: number): boolean {
  return status >= LOG_THRESHOLD;
}

function createBody(error: HttpError, status: number): ErrorBody {
  const detail = status >= LOG_THRESHOLD ? INTERNAL_MESSAGE : error.message;
  return { detail };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  void _next;
  const httpError = resolveError(error);
  const status = httpError.status;
  if (shouldLog(status)) console.error('[Error]', httpError);
  res.status(status).json(createBody(httpError, status));
}

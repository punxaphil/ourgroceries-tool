const MIN_STATUS = 400;
const MAX_STATUS = 599;
const DEFAULT_STATUS = 500;

export interface HttpError extends Error {
  status: number;
  details?: unknown;
}

function normalizeStatus(status: number): number {
  if (Number.isFinite(status) && status >= MIN_STATUS && status <= MAX_STATUS) {
    return Math.trunc(status);
  }
  return DEFAULT_STATUS;
}

export function isHttpError(value: unknown): value is HttpError {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HttpError> & { message?: unknown };
  return typeof candidate.status === 'number' && typeof candidate.message === 'string';
}

export function createHttpError(status: number, message: string, details?: unknown): HttpError {
  const error = new Error(message) as HttpError;
  error.status = normalizeStatus(status);
  if (details !== undefined) error.details = details;
  return error;
}

export function ensureHttpError(
  value: unknown,
  fallbackMessage: string,
  fallbackStatus: number = DEFAULT_STATUS
): HttpError {
  if (isHttpError(value)) return value;
  const message = value instanceof Error ? value.message : undefined;
  const trimmed = typeof message === 'string' ? message.trim() : '';
  const finalMessage = trimmed.length > 0 ? trimmed : fallbackMessage;
  return createHttpError(fallbackStatus, finalMessage);
}

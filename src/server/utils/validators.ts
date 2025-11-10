import { createHttpError } from './httpError.js';
import { sanitizeRequestString } from './strings.js';

const DEFAULT_MAX_LENGTH = 4096;

type Predicate<T> = (value: unknown) => value is T;

const VALIDATION_STATUS = 400;

function validationError(message: string) {
  return createHttpError(VALIDATION_STATUS, message);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  return !Array.isArray(value);
}

export function ensureObject(value: unknown, context: string): Record<string, unknown> {
  if (isObject(value)) return value as Record<string, unknown>;
  throw validationError(`${context} must be a JSON object.`);
}

export function ensureString(value: unknown, context: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  const normalized = sanitizeRequestString(value, maxLength);
  if (normalized) return normalized;
  throw validationError(`${context} must be a non-empty string.`);
}

export function ensureOptionalString(
  value: unknown,
  context: string,
  maxLength: number = DEFAULT_MAX_LENGTH
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return ensureString(value, context, maxLength);
}

export function ensureArray<T>(value: unknown, context: string, predicate?: Predicate<T>): T[] {
  if (!Array.isArray(value)) throw validationError(`${context} must be an array.`);
  if (!predicate) return value as T[];
  const invalid = value.find((item) => !predicate(item));
  if (invalid === undefined) return value as T[];
  throw validationError(`${context} contains invalid entries.`);
}

const TRUTHY_STRINGS = new Set(['true', '1', 'on', 'yes']);
const FALSY_STRINGS = new Set(['false', '0', 'off', 'no']);
const DECIMAL_RADIX = 10;

export function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

export function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const stringValue = coerceString(value);
  if (!stringValue) {
    return undefined;
  }
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function coerceInteger(value: unknown): number | undefined {
  const parsed = coerceNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  const stringValue = coerceString(value);
  if (!stringValue) {
    return undefined;
  }
  const normalized = stringValue.toLowerCase();
  if (TRUTHY_STRINGS.has(normalized)) {
    return true;
  }
  if (FALSY_STRINGS.has(normalized)) {
    return false;
  }
  return undefined;
}

export function coerceArray<T>(value: unknown): T[] | undefined {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return undefined;
}

export function coerceRecord<T>(value: unknown): Record<string, T> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, T>;
  }
  return undefined;
}

export function coerceIntegerFromString(value: string, radix: number = DECIMAL_RADIX): number | undefined {
  const parsed = parseInt(value, radix);
  return Number.isNaN(parsed) ? undefined : parsed;
}

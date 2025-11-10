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

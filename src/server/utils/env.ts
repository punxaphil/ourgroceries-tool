const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

export function getEnvString(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function requireEnvString(key: string): string {
  const value = getEnvString(key);
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = getEnvString(key);
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean environment variable ${key}: ${value}`);
}

export function getEnvNumber(key: string, defaultValue?: number): number | undefined {
  const value = getEnvString(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number environment variable ${key}: ${value}`);
  }
  return parsed;
}

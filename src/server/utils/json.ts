import { JsonValue } from '../types.js';

const PRETTY_INDENT = 2;

export function isJsonRecord(value: unknown): value is Record<string, JsonValue> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  return !Array.isArray(value);
}

export function ensureJsonRecord(value: unknown, context = 'payload'): Record<string, JsonValue> {
  if (!isJsonRecord(value)) {
    throw new Error(`Expected ${context} to be a JSON object.`);
  }
  return value;
}

export function parseJson(text: string): JsonValue {
  if (typeof text !== 'string') {
    throw new Error('JSON input must be a string.');
  }
  return JSON.parse(text) as JsonValue;
}

export function tryParseJson(text: string): JsonValue | undefined {
  try {
    return parseJson(text);
  } catch {
    return undefined;
  }
}

export function stringifyJson(value: JsonValue, pretty = false): string {
  return pretty ? JSON.stringify(value, null, PRETTY_INDENT) : JSON.stringify(value);
}

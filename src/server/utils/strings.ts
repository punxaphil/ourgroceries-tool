const SINGLE_SPACE = ' ';
const EMPTY_STRING = '';
const DEFAULT_ELLIPSIS = '…';

export function trimAndCollapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, SINGLE_SPACE);
}

export function sanitizeRequestString(value: unknown, maxLength?: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = trimAndCollapseWhitespace(value);
  if (trimmed.length === 0) return undefined;
  if (typeof maxLength === 'number' && maxLength > 0) {
    return truncateWithEllipsis(trimmed, maxLength, EMPTY_STRING);
  }
  return trimmed;
}

export function truncateWithEllipsis(value: string, maxLength: number, ellipsis: string = DEFAULT_ELLIPSIS): string {
  if (maxLength <= 0 || value.length <= maxLength) {
    return value;
  }
  const limit = Math.max(maxLength - ellipsis.length, 0);
  return value.slice(0, limit).trimEnd() + ellipsis;
}

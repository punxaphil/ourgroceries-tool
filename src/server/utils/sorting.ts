const EMPTY_SORT_KEY = '';

export function hasSortKey(key?: string | null): boolean {
  if (!key) return false;
  return key.trim().length > 0;
}

export function normalizeSortKey(key?: string | null): string {
  if (!hasSortKey(key)) return EMPTY_SORT_KEY;
  return key!.trim();
}

export function compareSortKeys(first?: string | null, second?: string | null): number {
  const firstHasKey = hasSortKey(first);
  const secondHasKey = hasSortKey(second);
  if (firstHasKey && !secondHasKey) return -1;
  if (!firstHasKey && secondHasKey) return 1;
  if (!firstHasKey && !secondHasKey) return 0;
  const normalizedFirst = normalizeSortKey(first);
  const normalizedSecond = normalizeSortKey(second);
  if (normalizedFirst < normalizedSecond) return -1;
  if (normalizedFirst > normalizedSecond) return 1;
  return 0;
}

export function compareSortKeyThenName(
  firstKey: string | null | undefined,
  firstName: string,
  secondKey: string | null | undefined,
  secondName: string
): number {
  const keyComparison = compareSortKeys(firstKey, secondKey);
  if (keyComparison !== 0) return keyComparison;
  if (firstName < secondName) return -1;
  if (firstName > secondName) return 1;
  return 0;
}

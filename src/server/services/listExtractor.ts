import { ShoppingListSummary } from '../types.js';
import { coerceString } from '../utils/coerce.js';

const LIST_SUFFIXES = ['list', 'lists'];
function shouldInspectKey(key: string): boolean {
  return LIST_SUFFIXES.some((suffix) => key.toLowerCase().endsWith(suffix));
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

interface ExtractionContext {
  seen: Set<string>;
  results: ShoppingListSummary[];
  stack: unknown[];
}

function addSummary(value: unknown, context: ExtractionContext): void {
  if (!isRecord(value)) return;
  const record = value as Record<string, unknown>;
  const id = coerceString(record.id);
  const name = coerceString(record.name);
  if (!id || !name || context.seen.has(id)) return;
  context.seen.add(id);
  context.results.push({ id, name });
}

function processEntry(key: string, value: unknown, context: ExtractionContext): void {
  if (shouldInspectKey(key) && Array.isArray(value)) {
    value.forEach((item) => addSummary(item, context));
  }
  context.stack.push(value);
}

function enqueueArrayItems(items: unknown[], context: ExtractionContext): void {
  items.forEach((item) => context.stack.push(item));
}

function traverseRecord(record: Record<string, unknown>, context: ExtractionContext): void {
  Object.entries(record).forEach(([key, child]) => processEntry(key, child, context));
}

function processValue(value: unknown, context: ExtractionContext): void {
  if (Array.isArray(value)) {
    enqueueArrayItems(value, context);
    return;
  }
  if (!isRecord(value)) return;
  traverseRecord(value, context);
}

function drainStack(context: ExtractionContext): void {
  while (context.stack.length > 0) {
    const value = context.stack.pop();
    if (value === undefined) continue;
    processValue(value, context);
  }
}

export function extractShoppingLists(payload: unknown): ShoppingListSummary[] {
  const context: ExtractionContext = {
    seen: new Set<string>(),
    results: [],
    stack: [payload],
  };
  drainStack(context);
  return context.results;
}

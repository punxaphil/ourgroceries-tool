import { coerceArray, coerceRecord, coerceString } from '../../utils/coerce.js';
import { DEFAULT_MASTER_LIST_NAME, UNKNOWN_MASTER_LIST_ID } from './constants.js';

const LIST_KEY = 'list';
const RECORD_ERROR = 'Unexpected master list response structure.';

export type MasterListRecord = Record<string, unknown>;
export type MasterListItemRecord = Record<string, unknown>;

export function requireMasterListRecord(payload: unknown): MasterListRecord {
  const root = coerceRecord<unknown>(payload);
  const record = root ? coerceRecord<unknown>(root[LIST_KEY]) : null;
  if (record) return record as MasterListRecord;
  throw new Error(RECORD_ERROR);
}

export function readMasterListId(record: MasterListRecord): string {
  return coerceString(record.id) ?? UNKNOWN_MASTER_LIST_ID;
}

export function readMasterListName(record: MasterListRecord): string {
  return coerceString(record.name) ?? DEFAULT_MASTER_LIST_NAME;
}

export function readMasterListItems(record: MasterListRecord): unknown[] {
  return coerceArray<unknown>(record.items) ?? [];
}

export function toMasterListItemRecord(entry: unknown): MasterListItemRecord | null {
  const record = coerceRecord<unknown>(entry);
  return record ? (record as MasterListItemRecord) : null;
}

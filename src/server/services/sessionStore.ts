import { randomBytes } from 'crypto';

export const SESSION_COOKIE_NAME = 'ogSession';

export interface SessionRecord {
  id: string;
  email: string;
  password: string;
  expiresAt: number;
}

type SessionMap = Map<string, SessionRecord>;

const sessions: SessionMap = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function now(): number {
  return Date.now();
}

function createIdentifier(): string {
  return randomBytes(24).toString('hex');
}

function extend(record: SessionRecord): void {
  record.expiresAt = now() + SESSION_TTL_MS;
}

export function createSession(email: string, password: string): SessionRecord {
  const record: SessionRecord = { id: createIdentifier(), email, password, expiresAt: 0 };
  extend(record);
  sessions.set(record.id, record);
  return record;
}

export function findSession(id: string): SessionRecord | undefined {
  const record = sessions.get(id);
  if (!record) return undefined;
  if (record.expiresAt <= now()) {
    sessions.delete(id);
    return undefined;
  }
  extend(record);
  return record;
}

export function removeSession(id: string): void {
  sessions.delete(id);
}

export function resetSessions(): void {
  sessions.clear();
}

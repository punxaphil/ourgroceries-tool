import { randomBytes } from 'crypto';

export const SESSION_COOKIE_NAME = 'ogSession';

export interface SessionRecord {
  id: string;
  email: string;
  password: string;
}

type SessionMap = Map<string, SessionRecord>;

const sessions: SessionMap = new Map();

const createIdentifier = () => randomBytes(24).toString('hex');

export const createSession = (email: string, password: string): SessionRecord => {
  const record: SessionRecord = { id: createIdentifier(), email, password };
  sessions.set(record.id, record);
  return record;
};

export const findSession = (id: string): SessionRecord | undefined => sessions.get(id);

export const removeSession = (id: string): void => {
  sessions.delete(id);
};

export const resetSessions = (): void => {
  sessions.clear();
};


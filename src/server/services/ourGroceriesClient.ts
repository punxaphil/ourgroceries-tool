import { InvalidLoginException, OurGroceries } from 'ourgroceries';
import { createHttpError } from '../utils/httpError.js';
import { createSession, findSession, removeSession, resetSessions } from './sessionStore.js';
import type { SessionRecord } from './sessionStore.js';

type ClientPromise = Promise<OurGroceries>;

const LOGIN_FAILURE_MESSAGE = 'OurGroceries login failed.';
const SESSION_MISSING_MESSAGE = 'Session not found.';

const clientCache: Map<string, ClientPromise> = new Map();

function toLoginError(error: unknown): Error {
  if (error instanceof InvalidLoginException) return createHttpError(401, LOGIN_FAILURE_MESSAGE);
  if (error instanceof Error) return error;
  return createHttpError(500, String(error));
}

async function loginClient(email: string, password: string): Promise<OurGroceries> {
  const client = new OurGroceries({ username: email, password });
  try {
    await client.login();
    return client;
  } catch (error) {
    throw toLoginError(error);
  }
}

function requireSessionRecord(sessionId: string): SessionRecord {
  const session = findSession(sessionId);
  if (session) return session;
  throw createHttpError(401, SESSION_MISSING_MESSAGE);
}

function cacheClient(sessionId: string, promise: ClientPromise): void {
  clientCache.set(sessionId, promise);
}

function clearSessionState(sessionId: string): void {
  clientCache.delete(sessionId);
  removeSession(sessionId);
}

async function settleLogin(session: SessionRecord, promise: ClientPromise): Promise<string> {
  try {
    await promise;
    return session.id;
  } catch (error) {
    clearSessionState(session.id);
    throw error;
  }
}

function requireCachedClient(session: SessionRecord): ClientPromise {
  const cached = clientCache.get(session.id);
  if (cached) return cached;
  const promise = loginClient(session.email, session.password);
  cacheClient(session.id, promise);
  return promise;
}

async function resolveClient(sessionId: string, promise: ClientPromise): Promise<OurGroceries> {
  try {
    return await promise;
  } catch (error) {
    clientCache.delete(sessionId);
    throw error;
  }
}

export async function loginSession(email: string, password: string): Promise<string> {
  const session = createSession(email, password);
  const promise = loginClient(email, password);
  cacheClient(session.id, promise);
  return settleLogin(session, promise);
}

export async function getOurGroceriesClient(sessionId: string): Promise<OurGroceries> {
  const session = requireSessionRecord(sessionId);
  const promise = requireCachedClient(session);
  return resolveClient(sessionId, promise);
}

export function logoutSession(sessionId: string): void {
  clearSessionState(sessionId);
}

export function clearOurGroceriesClientCache(): void {
  clientCache.clear();
  resetSessions();
}

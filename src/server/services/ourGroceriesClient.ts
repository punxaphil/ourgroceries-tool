import { InvalidLoginException, OurGroceries } from 'ourgroceries';
import { createHttpError } from '../utils/httpError.js';
import { createSession, findSession, removeSession, resetSessions } from './sessionStore.js';

type ClientPromise = Promise<OurGroceries>;

const LOGIN_FAILURE_MESSAGE = 'OurGroceries login failed.';
const SESSION_MISSING_MESSAGE = 'Session not found.';

const clientCache: Map<string, ClientPromise> = new Map();

const toLoginError = (error: unknown): Error => {
  if (error instanceof InvalidLoginException) return createHttpError(401, LOGIN_FAILURE_MESSAGE);
  if (error instanceof Error) return error;
  return createHttpError(500, String(error));
};

const loginClient = async (email: string, password: string): Promise<OurGroceries> => {
  const client = new OurGroceries({ username: email, password });
  try {
    await client.login();
    return client;
  } catch (error) {
    throw toLoginError(error);
  }
};

const requireSessionRecord = (sessionId: string) => {
  const session = findSession(sessionId);
  if (session) return session;
  throw createHttpError(401, SESSION_MISSING_MESSAGE);
};

export const loginSession = async (email: string, password: string): Promise<string> => {
  const session = createSession(email, password);
  const promise = loginClient(email, password);
  clientCache.set(session.id, promise);
  try {
    await promise;
    return session.id;
  } catch (error) {
    clientCache.delete(session.id);
    removeSession(session.id);
    throw error;
  }
};

export const getOurGroceriesClient = async (sessionId: string): Promise<OurGroceries> => {
  const session = requireSessionRecord(sessionId);
  let promise = clientCache.get(sessionId);
  if (!promise) {
    promise = loginClient(session.email, session.password);
    clientCache.set(sessionId, promise);
  }
  try {
    return await promise;
  } catch (error) {
    clientCache.delete(sessionId);
    throw error;
  }
};

export const logoutSession = (sessionId: string): void => {
  clientCache.delete(sessionId);
  removeSession(sessionId);
};

export const clearOurGroceriesClientCache = (): void => {
  clientCache.clear();
  resetSessions();
};

import type { RequestHandler } from 'express';
import { createHttpError } from '../utils/httpError.js';
import { findSession, removeSession } from '../services/sessionStore.js';
import { clearSessionCookie, readSessionId } from '../utils/sessionCookie.js';

const UNAUTHORIZED_MESSAGE = 'Authentication required.';

export const requireSession: RequestHandler = (req, res, next) => {
  const sessionId = readSessionId(req);
  if (!sessionId) throw createHttpError(401, UNAUTHORIZED_MESSAGE);
  const session = findSession(sessionId);
  if (!session) {
    clearSessionCookie(res);
    removeSession(sessionId);
    throw createHttpError(401, UNAUTHORIZED_MESSAGE);
  }
  req.sessionId = sessionId;
  next();
};

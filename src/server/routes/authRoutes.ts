import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createHttpError } from '../utils/httpError.js';
import { loginSession, logoutSession } from '../services/ourGroceriesClient.js';
import { findSession } from '../services/sessionStore.js';
import { clearSessionCookie, readSessionId, writeSessionCookie } from '../utils/sessionCookie.js';

const authRouter = Router();

const INVALID_CREDENTIALS_MESSAGE = 'Email and password are required.';

const normalize = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const readCredentials = (body: unknown) => {
  const source = (body as Record<string, unknown>) ?? {};
  const email = normalize(source.email);
  const password = normalize(source.password);
  if (!email || !password) throw createHttpError(400, INVALID_CREDENTIALS_MESSAGE);
  return { email, password };
};

authRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const sessionId = readSessionId(req);
    const session = sessionId ? findSession(sessionId) : undefined;
    res.json({ authenticated: Boolean(session), email: session?.email ?? null });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = readCredentials(req.body);
    const currentSessionId = readSessionId(req);
    if (currentSessionId) logoutSession(currentSessionId);
    const sessionId = await loginSession(email, password);
    writeSessionCookie(res, sessionId);
    res.json({ authenticated: true, email });
  })
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const sessionId = readSessionId(req);
    if (sessionId) logoutSession(sessionId);
    clearSessionCookie(res);
    res.json({ authenticated: false });
  })
);

export default authRouter;

import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../services/sessionStore.js';

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, entry) => {
    const [rawKey, ...rest] = entry.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function secureFlag(): boolean {
  return process.env.NODE_ENV === 'production';
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: secureFlag(),
    path: '/',
  };
}

export function readSessionId(req: Request): string | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function writeSessionCookie(res: Response, value: string): void {
  res.cookie(SESSION_COOKIE_NAME, value, { ...baseCookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { ...baseCookieOptions(), maxAge: 0 });
}

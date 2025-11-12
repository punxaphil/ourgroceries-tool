import { useCallback, useEffect, useState } from 'react';
import { readApiError } from './apiUtils';

const STATUS_ENDPOINT = '/api/auth/status';
const LOGIN_ENDPOINT = '/api/auth/login';
const LOGOUT_ENDPOINT = '/api/auth/logout';
const AUTH_ERROR_MESSAGE = 'Unable to authenticate. Please try again.';
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

type StatusPayload = {
  authenticated: boolean;
  email: string | null;
};

const parseStatus = (payload: unknown): StatusPayload => {
  if (!payload || typeof payload !== 'object') return { authenticated: false, email: null };
  const source = payload as { authenticated?: unknown; email?: unknown };
  const authenticated = Boolean(source.authenticated);
  const email = typeof source.email === 'string' ? source.email : null;
  return { authenticated, email };
};

const fetchStatus = async (): Promise<StatusPayload> => {
  try {
    const response = await fetch(STATUS_ENDPOINT, { credentials: 'same-origin' });
    if (!response.ok) return { authenticated: false, email: null };
    const payload = await response.json().catch(() => null);
    return parseStatus(payload);
  } catch (error) {
    console.error('Auth status error:', error);
    return { authenticated: false, email: null };
  }
};

const loginRequestInit = (email: string, password: string) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin' as const,
  body: JSON.stringify({ email, password }),
});

const requestLogin = async (email: string, password: string): Promise<StatusPayload> => {
  const response = await fetch(LOGIN_ENDPOINT, loginRequestInit(email, password));
  if (!response.ok) throw new Error(await readApiError(response));
  const payload = await response.json().catch(() => ({ authenticated: true, email }));
  return parseStatus(payload);
};

export interface UseAuthResult {
  authenticated: boolean;
  checking: boolean;
  loggingIn: boolean;
  email: string | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  handleUnauthorized: () => void;
}

export const useAuth = (): UseAuthResult => {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyStatus = useCallback((status: StatusPayload) => {
    setAuthenticated(status.authenticated);
    setEmail(status.email);
  }, []);

  const handleLoginFailure = useCallback(
    (authError: unknown) => {
      console.error('Login error:', authError);
      applyStatus({ authenticated: false, email: null });
      const message = authError instanceof Error && authError.message ? authError.message : AUTH_ERROR_MESSAGE;
      setError(message);
    },
    [applyStatus]
  );

  const loadStatus = useCallback(async () => {
    setChecking(true);
    const status = await fetchStatus();
    applyStatus(status);
    setError(null);
    setChecking(false);
  }, [applyStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const login = useCallback(
    async (emailAddress: string, password: string) => {
      if (loggingIn) return;
      setLoggingIn(true);
      setError(null);
      try {
        const status = await requestLogin(emailAddress, password);
        applyStatus(status);
      } catch (authError) {
        handleLoginFailure(authError);
      }
      setLoggingIn(false);
      setChecking(false);
    },
    [applyStatus, handleLoginFailure, loggingIn]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(LOGOUT_ENDPOINT, { method: 'POST', credentials: 'same-origin' });
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      applyStatus({ authenticated: false, email: null });
      setError(null);
    }
  }, [applyStatus]);

  const handleUnauthorized = useCallback(() => {
    applyStatus({ authenticated: false, email: null });
    setError(SESSION_EXPIRED_MESSAGE);
    setChecking(false);
    setLoggingIn(false);
  }, [applyStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    authenticated,
    checking,
    loggingIn,
    email,
    error,
    login,
    logout,
    clearError,
    handleUnauthorized,
  };
};

const DEFAULT_ERROR_MESSAGE = 'Request failed';
export const UNAUTHORIZED_ERROR = 'Session expired. Please log in again.';

function extractDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const detail = (payload as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : null;
}

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function readApiError(response: Response): Promise<string> {
  const fallback = `${DEFAULT_ERROR_MESSAGE} (${response.status})`;
  const text = await response.text();
  if (!text) return fallback;
  const payload = parseJson(text);
  const detail = extractDetail(payload);
  if (detail) return detail;
  if (text.trim()) return text;
  return fallback;
}

export function handleUnauthorized(response: Response, onUnauthorized: () => void): boolean {
  if (response.status !== 401) return false;
  onUnauthorized();
  return true;
}

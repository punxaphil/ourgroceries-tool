const DEFAULT_ERROR_MESSAGE = 'Request failed';

const extractDetail = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const detail = (payload as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : null;
};

const parseJson = (text: string): unknown => {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const readApiError = async (response: Response): Promise<string> => {
  const fallback = `${DEFAULT_ERROR_MESSAGE} (${response.status})`;
  const text = await response.text();
  if (!text) return fallback;
  const payload = parseJson(text);
  const detail = extractDetail(payload);
  if (detail) return detail;
  if (text.trim()) return text;
  return fallback;
};

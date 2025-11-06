import { InvalidLoginException, OurGroceries } from 'ourgroceries';
import { requireEnvString } from '../utils/env.js';

type ClientPromise = Promise<OurGroceries> | null;

const EMAIL_ENV = 'OURGROCERIES_EMAIL';
const PASSWORD_ENV = 'OURGROCERIES_PASSWORD';
const LOGIN_FAILURE_MESSAGE = 'OurGroceries login failed.';
const PLACEHOLDER_EMAIL = 'your_email@example.com';
const PLACEHOLDER_EMAIL_ERROR = 'OURGROCERIES_EMAIL is using the placeholder value.';

let cachedClientPromise: ClientPromise = null;

function ensureRealEmail(email: string) {
  if (email === PLACEHOLDER_EMAIL) {
    throw new Error(PLACEHOLDER_EMAIL_ERROR);
  }
  return email;
}

function mapLoginError(error: unknown): never {
  if (error instanceof InvalidLoginException) {
    throw new Error(LOGIN_FAILURE_MESSAGE);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(String(error));
}

function readCredentials() {
  const email = ensureRealEmail(requireEnvString(EMAIL_ENV));
  const password = requireEnvString(PASSWORD_ENV);
  return { email, password };
}

async function createClient() {
  const { email, password } = readCredentials();
  const client = new OurGroceries({ username: email, password });
  await client.login().catch(mapLoginError);
  return client;
}

export async function getOurGroceriesClient() {
  if (!cachedClientPromise) {
    cachedClientPromise = createClient();
  }
  try {
    return await cachedClientPromise;
  } catch (error) {
    cachedClientPromise = null;
    throw error;
  }
}

export function clearOurGroceriesClientCache() {
  cachedClientPromise = null;
}

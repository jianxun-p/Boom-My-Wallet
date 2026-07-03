import type { User } from '@/types/user.d.ts';
import type { ApiKey } from '@/types/auth.d.ts';
import crypto from 'crypto';
import { AppError, MissingArgError } from '@/model/apperror.js';
import { saveUserToDatabase } from '@/repositories/user.js';
import { getUserData } from '@/model/user.js';
import type { ApiKeySummary, CreateApiKeyData, ListApiKeysData } from '@/types/controller.d.ts';

const WORK_FACTOR = 64;
const API_KEY_LENGTH = 64;
const API_KEY_SALT_LENGTH = 32;
const API_KEY_FIRST_HASH_ALGORITHM = 'sha256';
const ENCODING = 'base64';

export function findApiKey(apikey: string, apikeys: ApiKey[] = []): ApiKey | null {
  const keyBuf = crypto.hash('sha256', Buffer.from(apikey ?? '', ENCODING)); // TODO: check if it is contained in data breaches
  const found = apikeys.find((at) => {
    if (!at.hash || !at.salt) return false;
    const storedHash = Buffer.from(at.hash, ENCODING);
    const storedSalt = Buffer.from(at.salt, ENCODING);
    const hashedKey = crypto.scryptSync(keyBuf, storedSalt, WORK_FACTOR);
    return keyBuf.length == storedHash.length && crypto.timingSafeEqual(storedHash, hashedKey);
  });
  return found ?? null;
}

function toApiKeySummary(apiKey: ApiKey): ApiKeySummary {
  return { name: apiKey.name, createdOn: apiKey.createdOn };
}

export function listApiKeys(user: User): ListApiKeysData {
  return {
    apikeys: user.apiKeys.map((k) => {
      return toApiKeySummary(k);
    }),
  };
}

export function getApiKey(user: User, rawName: string): ApiKeySummary {
  const name = rawName.toString().trim();
  const key = user.apiKeys.find((k) => k.name === name);
  if (key === undefined) {
    throw new AppError('API key not found', 404);
  }
  return toApiKeySummary(key);
}

export async function createApiKey(user: User, rawName: string): Promise<CreateApiKeyData> {
  const name = rawName.toString().trim();
  if (!name) {
    throw new MissingArgError('name');
  }
  if (user.apiKeys.find((k) => k.name === name)) {
    throw new AppError('API key with the same name already exists', 400);
  }

  const newKeyVal = crypto.randomBytes(API_KEY_LENGTH);
  const newKeySalt = crypto.randomBytes(API_KEY_SALT_LENGTH);
  const newKey: ApiKey = {
    name: name,
    salt: newKeySalt.toString(ENCODING),
    hash: crypto
      .scryptSync(crypto.hash(API_KEY_FIRST_HASH_ALGORITHM, newKeyVal), newKeySalt, WORK_FACTOR)
      .toString(ENCODING),
    createdOn: Date.now(),
  };

  user.apiKeys.push(newKey);
  try {
    await saveUserToDatabase(getUserData(user));
  } catch (e) {
    console.error('Failed creating API key:', e);
    throw new AppError('Failed creating API key.');
  }
  return {
    apikey: {
      name,
      createdOn: newKey.createdOn,
      key: newKeyVal.toString(ENCODING),
    },
  };
}

export async function deleteApiKey(user: User, rawName: string): Promise<void> {
  const name = rawName.toString().trim();
  const oldApikeys = user.apiKeys;
  const newApikeys = oldApikeys.filter((k) => (k.name ?? null) !== name);
  if (newApikeys.length === oldApikeys.length) {
    throw new AppError('API key not found', 404);
  }

  user.apiKeys = newApikeys;
  try {
    await saveUserToDatabase(getUserData(user));
  } catch (e) {
    console.error('Failed deleting API key:', e);
    throw new AppError('Failed deleting API key.');
  }
}

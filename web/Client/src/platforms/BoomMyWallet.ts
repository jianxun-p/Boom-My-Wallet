import type { User } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const UserAPI = {
  ListApiKeys: { method: 'GET', path: '/apikeys' },
  CreateApiKey: { method: 'POST', path: '/apikeys' },
  GetApiKey: { method: 'GET', path: '/apikeys/{name}' },
  DeleteApiKey: { method: 'DELETE', path: '/apikeys/{name}' },

  ListTransactions: { method: 'GET', path: '/transactions' },
  PostTransaction: { method: 'POST', path: '/transactions' },
  UpdateTransaction: { method: 'PUT', path: '/transactions/{tid}' },
  DeleteTransaction: { method: 'DELETE', path: '/transactions/{tid}' },
  ConnectGoogleSheets: { method: 'GET', path: '/transactions/services/googleSheets/connect' },

  // UpdateGoogleSheetsInfo: { method: 'PUT', path: '/google_sheets' },
} as const;

export type UserAPI = (typeof UserAPI)[keyof typeof UserAPI];

export async function getUser(): Promise<{ uid: string }> {
  const url = `/auth/user`;
  return await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
    .then((res) => {
      if (res.ok) return res.json();
      throw Error(`${res.status} ${res.statusText}: ${res.body}`);
    })
    .then((res) => {
      if (res.error) {
        throw Error('Unauthorized');
      } else {
        return res.data;
      }
    });
}

export function getUserApiUrl(
  user: User,
  api: UserAPI,
  params?: Record<string, unknown>,
  query?: Record<string, string>,
): string {
  const apiPath = Object.entries(params ?? {}).reduce((acc, [key, val]) => {
    return acc.replaceAll(`{${key}}`, String(val));
  }, String(api.path));
  const urlSearchParams = new URLSearchParams(query ?? {});
  return `${API_BASE_URL}/v1/users/${encodeURIComponent(user.uid)}${apiPath}?${urlSearchParams}`;
}

export async function requestUserApi(
  user: User,
  api: UserAPI,
  params?: Record<string, unknown>,
  query?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = getUserApiUrl(user, api, params, query);
  return await fetch(url, {
    method: api.method,
    body: params ? JSON.stringify(params) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => {
      if (res.ok) return res.json();
      throw Error(`${res.status} ${res.statusText}: ${res.body}`);
    })
    .then((res) => {
      if (res.error) {
        throw Error(res.error);
      } else {
        return res.data;
      }
    });
}

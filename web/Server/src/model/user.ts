import { findApiKey } from '@/services/apikey.js';
import type { ApiKey, AuthServiceProvider } from '@/types/auth.d.ts';
import type { User, UserData } from '@/types/user.d.ts';
import { findUserByUid } from '@/repositories/user.js';

export async function userFromUserData(
  userData: UserData,
  logout: () => Promise<void> = async () => {},
  deleteAccount: () => Promise<void> = async () => {},
): Promise<User> {
  return Promise.resolve(
    Object.assign(
      {
        logout,
        deleteAccount,
      },
      userData,
    ),
  );
}

export async function userFromApiKey(uid: string | null, apiKey: string): Promise<User | null> {
  if (uid === null) {
    return null;
  }
  const user = await findUserByUid(uid)
    .then(async (data) => {
      return {
        data: data,
        apiKey: await findApiKey(apiKey, (data?.apiKeys ?? []) as ApiKey[]),
      };
    })
    .then(({ data }) => (data !== null ? userFromUserData(data) : null));
  return user;
}

export function getUserData(user: User): UserData {
  return JSON.parse(JSON.stringify(user)) as UserData;
}

export function newUser(
  auth: Record<string, unknown> = {},
  logout: () => Promise<void> = async () => {},
  deleteAccount: () => Promise<void> = async () => {},
): User {
  return {
    uid: crypto.randomUUID().toString(),
    apiKeys: [],
    transactionServices: [],
    auth,
    logout,
    deleteAccount,
    registerTime: Date.now(),
    lastLogin: Date.now(),
  };
}

type UserAuthServiceInfo = {
  provider: AuthServiceProvider;
  info: Record<string, unknown>;
};
export function getUserAuthServiceInfo(user: User): UserAuthServiceInfo | null {
  const info = Object.entries(user.auth).find(() => true);
  return info === undefined ? null : ({ provider: info[0], info: info[1] } as UserAuthServiceInfo);
}

export type AuthServiceProvider = 'google';

export type AuthServiceInfo = {
  [key: AuthServiceProvider]: Record<string, unknown> | undefined;
};

export interface IAuthService {
  provider: AuthServiceProvider;
  initAccount(user: UserData): Promise<void>;
  deleteAccount(userData: UserData): Promise<void>;
}

type UserAuthServiceInfo = {
  provider: AuthServiceProvider;
  info: Record<string, unknown>;
};

export declare function getUserAuthServiceInfo(user: User): UserAuthServiceInfo | null;

export interface ApiKey {
  name: string;
  // key: string
  salt: string;
  hash: string;
  createdOn: number;
}

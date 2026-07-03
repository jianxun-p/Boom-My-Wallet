import { type ApiKey, type AuthServiceInfo } from '@/types/auth';
import { type TransactionServiceInfo } from '@/types/transaction';

export type UserData = {
  uid: string;
  apiKeys: ApiKey[];
  auth: AuthServiceInfo;
  transactionServices: TransactionServiceInfo[];
  registerTime: number;
  lastLogin: number;
};

export type User = UserData & {
  logout(): Promise<void>;
  deleteAccount(): Promise<void>;
};

export declare function userFromUserData(
  userData: UserData,
  logout?: () => Promise<void>,
  deleteAccount?: () => Promise<void>,
): Promise<User>;
export declare function userFromApiKey(uid: string | null, apiKey: string): Promise<User | null>;
export declare function getUserData(user: User): UserData;
export declare function newUser(
  auth?: Record<string, unknown>,
  logout?: () => Promise<void>,
  deleteAccount?: () => Promise<void>,
): User;

export declare const USER_COLLECTION = 'users';
export declare function findUserByUid(uid: string): Promise<UserData | null>;
export declare function findUserByAuthField(
  authFieldPath: string,
  value: string,
): Promise<UserData | null>;
export declare function saveUserToDatabase(userData: UserData): Promise<void>;

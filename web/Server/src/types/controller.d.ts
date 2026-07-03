import type { ApiKey } from '@/types/auth';
import type { Transaction, TransactionData } from '@/types/transaction';
import type { UserData } from '@/types/user';
import type { NextFunction } from 'express';

export type EmptyParams = Record<string, never>;
export type EmptyBody = Record<string, never>;
export type EmptyQuery = Record<string, never>;

export type SuccessResponse<TData = EmptyBody, TMeta = EmptyBody> = {
  data: TData;
  message?: string;
  meta?: TMeta;
};

export type ErrorResponse = {
  error: {
    message: string;
  };
};

export type UserParams = {
  uid: string;
};

export type ApiKeyNameParams = UserParams & {
  name: string;
};

export type TransactionIdParams = UserParams & {
  tid: string;
};

export type CreateApiKeyBody = {
  name?: string;
};

export type TransactionPayload = Partial<Omit<TransactionData, 'amount' | 'time' | 'deleted'>> & {
  amount?: string | number;
  time?: string | number | Date;
};

export type TransactionRequestBody = {
  transaction?: TransactionPayload;
};

export type OauthCallbackQuery = {
  code?: string;
  state?: string;
};

export type GoogleSheetsConnectQuery = {
  transactionServiceId?: string;
};

export type AuthUserData = {
  uid: string;
};

export type AuthUserResponse = SuccessResponse<AuthUserData>;

export type ApiKeySummary = Pick<ApiKey, 'name' | 'createdOn'>;

export type ListApiKeysData = {
  apikeys: ApiKeySummary[];
};

export type ListApiKeysResponse = SuccessResponse<ListApiKeysData>;

export type GetApiKeyData = {
  apikey: ApiKeySummary;
};

export type GetApiKeyResponse = SuccessResponse<GetApiKeyData>;

export type CreateApiKeyData = {
  apikey: ApiKeySummary & {
    key: string;
  };
};

export type CreateApiKeyResponse = SuccessResponse<CreateApiKeyData>;

export type MessageResponse = SuccessResponse;

export type ListTransactionsData = {
  transactions: Transaction[];
};

export type ListTransactionsResponse = SuccessResponse<ListTransactionsData>;

export type OauthRequestContext = {
  code?: string;
  state?: string;
  ip: string;
  userAgent: string;
  origin?: string;
  referer?: string;
  sessionUser?: UserData;
};

export type OauthCallbackResult = {
  redirectUrl: string;
  sessionUser?: UserData;
};

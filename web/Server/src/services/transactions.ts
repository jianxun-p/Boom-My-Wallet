import {
  GOOGLE_SHEETS_SERVICE,
  GoogleSheetsOauth,
  init as initGoogleSheets,
} from '../services/transactions/googleSheets.js';
import type {
  ITransactionService,
  Transaction,
  TransactionData,
  TransactionServiceInfo,
  TransactionServiceProvider,
} from '@/types/transaction.js';
import { AppError, MissingArgError, UnAuthError } from '@/model/apperror.js';
import type { UserData } from '@/types/user.js';
import type { ListTransactionsData } from '@/types/controller.d.ts';

export const OAUTH_SUCCESS_REDIRECT_URL = '/home';

export function fromTransactionServiceInfo(ts: TransactionServiceInfo): ITransactionService {
  switch (ts.provider) {
    case GOOGLE_SHEETS_SERVICE:
      return GoogleSheetsOauth.fromTransactionServiceInfo(ts);
    default:
      throw new AppError(`Unrecognized transaction service provider: "${ts.provider}"`);
  }
}

export function fromUserData(userData: UserData): ITransactionService[] {
  return userData.transactionServices.map(fromTransactionServiceInfo);
}

export function transactionServicesFromUserData(
  userData: UserData | null | undefined,
): ITransactionService[] {
  if (!userData) {
    throw new UnAuthError();
  }
  return fromUserData(userData);
}

export async function listTransactions(
  userData: UserData | null | undefined,
): Promise<ListTransactionsData> {
  const services = transactionServicesFromUserData(userData);
  if (services.length === 0) {
    throw new AppError('No transaction services found.', 403);
  }
  return {
    transactions: await services[0]!.getTransactions(),
  };
}

function requestTransactionRecord(reqTransaction: unknown): Record<string, unknown> {
  if (!reqTransaction || typeof reqTransaction !== 'object') {
    throw new MissingArgError('transaction');
  }
  return reqTransaction as Record<string, unknown>;
}

function transactionDataFromRequest(reqTransaction: unknown): TransactionData {
  const transaction = requestTransactionRecord(reqTransaction);
  const time = transaction['time'];
  return {
    time: Number(time ? new Date(time as string | number | Date) : new Date()),
    amount: Number(String(transaction['amount'] ?? '').replace(/[^0-9.-]/g, '')),
    currency: String(transaction['currency'] ?? ''),
    category: String(transaction['category'] ?? ''),
    merchant: String(transaction['merchant'] ?? ''),
    paymentMethod: String(transaction['paymentMethod'] ?? ''),
    location: String(transaction['location'] ?? ''),
    latitude: String(transaction['latitude'] ?? ''),
    longitude: String(transaction['longitude'] ?? ''),
    deleted: false,
    description: String(transaction['description'] ?? ''),
    imageUrl: String(transaction['imageUrl'] ?? ''),
  };
}

function transactionFromRequest(transactionId: string, reqTransaction: unknown): Transaction {
  const transactionData: TransactionData = {
    ...transactionDataFromRequest(reqTransaction),
  };
  return {
    id: transactionId,
    ...transactionData,
  };
}

function raiseTransactionServiceErrors(
  action: 'adding' | 'deleting' | 'updating',
  errors: { provider: TransactionServiceProvider; error: string }[],
): never {
  const dbgMsg = errors.map(({ provider, error }) => `${provider}: ${error}`).join(',\n');
  console.error(
    `Failed ${action} transaction to the following transaction service(s):\n${dbgMsg}.`,
  );
  const clientMsg = errors.map((e) => e.provider).join(',\n');
  throw new AppError(
    `Failed ${action} transaction to the following transaction service(s):\n${clientMsg}.`,
  );
}

export async function createTransaction(
  userData: UserData | null | undefined,
  reqTransaction: unknown,
): Promise<void> {
  const transactionData = transactionDataFromRequest(reqTransaction);
  const services = transactionServicesFromUserData(userData);
  const errors: { provider: TransactionServiceProvider; error: string }[] = [];
  await Promise.all(
    services.map((s) =>
      s
        .appendTransactions([transactionData])
        .catch((e) => errors.push({ provider: s.provider, error: String(e) })),
    ),
  );
  if (errors.length === 0) {
    return;
  }
  raiseTransactionServiceErrors('adding', errors);
}

export async function deleteTransaction(
  userData: UserData | null | undefined,
  transactionId: string,
): Promise<void> {
  const services = transactionServicesFromUserData(userData);
  const errors: { provider: TransactionServiceProvider; error: string }[] = [];
  await Promise.all(
    services.map((s) =>
      s
        .deleteTransactions([transactionId])
        .catch((e) => errors.push({ provider: s.provider, error: String(e) })),
    ),
  );
  if (errors.length === 0) {
    return;
  }
  raiseTransactionServiceErrors('deleting', errors);
}

export async function updateTransaction(
  userData: UserData | null | undefined,
  transactionId: string,
  reqTransaction: unknown,
): Promise<void> {
  const transaction = transactionFromRequest(transactionId, reqTransaction);
  const services = transactionServicesFromUserData(userData);
  const errors: { provider: TransactionServiceProvider; error: string }[] = [];
  await Promise.all(
    services.map((s) =>
      s
        .updateTransactions([transaction])
        .catch((e) => errors.push({ provider: s.provider, error: String(e) })),
    ),
  );
  if (errors.length === 0) {
    return;
  }
  raiseTransactionServiceErrors('updating', errors);
}

export async function init() {
  await Promise.all([initGoogleSheets()]);
  console.log('Initialized transactions service');
}

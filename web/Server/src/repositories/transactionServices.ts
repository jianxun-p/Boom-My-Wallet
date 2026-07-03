import { AppError, NotFoundError } from '@/model/apperror.js';
import type {
  TransactionServiceInfo,
  TransactionServiceInfoPartial,
} from '@/types/transaction.d.ts';
import type { UserData } from '@/types/user.d.ts';
import { USER_COLLECTION } from '@/repositories/user.js';
import { database } from './db.js';
import { saveUserToDatabase } from './user.js';

export async function getAllTransactionServiceInfo(
  userData: UserData,
): Promise<TransactionServiceInfo[]> {
  return Promise.resolve(userData.transactionServices);
}

export async function getTransactionServiceInfo(
  userData: UserData,
  transactionServiceId: string,
): Promise<TransactionServiceInfo | null> {
  const info = userData.transactionServices.find(
    (ts) => ts.transactionServiceId === transactionServiceId,
  );
  return Promise.resolve(info ?? null);
}

export async function updateTransactionServiceInfo(
  userData: UserData,
  transactionServiceId: string,
  info: TransactionServiceInfo,
): Promise<void> {
  const index = userData.transactionServices.findIndex(
    (tsi) => tsi.transactionServiceId === transactionServiceId,
  );
  if (index <= 0) {
    throw new NotFoundError('The transaction service does not exists');
  }
  userData.transactionServices[index] = { ...info };
  return await saveUserToDatabase(userData);
}

export async function addTransactionServiceInfo(
  userData: UserData,
  info: TransactionServiceInfoPartial,
): Promise<UserData> {
  const docRef = await database().collection(USER_COLLECTION).doc(userData.uid);
  const data = await docRef.data();
  if (data === null) {
    throw new NotFoundError('User does not exists');
  }
  const newUserData = data as UserData;
  let newId: string;
  let cnt = 0;
  do {
    newId = crypto.randomUUID().toString();
  } while (
    userData.transactionServices.find((ts) => ts.transactionServiceId === newId) &&
    cnt++ < 10
  );
  if (cnt >= 10) {
    throw new AppError('Unable to add new transaction service');
  }
  userData.transactionServices.push({ ...info, transactionServiceId: newId });
  await saveUserToDatabase(userData);
  return newUserData;
}

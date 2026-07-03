import type { UserData } from '@/types/user.d.ts';
import { database } from './db.js';

export const USER_COLLECTION = 'users';

export async function findUserByUid(uid: string): Promise<UserData | null> {
  return await database()
    .collection(USER_COLLECTION)
    .doc(uid)
    .then((docRef) => docRef.data() as Promise<UserData | null>);
}

export async function findUserByAuthField(
  authFieldPath: string,
  value: string,
): Promise<UserData | null> {
  return await database()
    .collection(USER_COLLECTION)
    .docByField(`auth.${authFieldPath}`, value)
    .then((docRef) => docRef.data())
    .then((data) => data as UserData | null);
}

export async function saveUserToDatabase(userData: UserData): Promise<void> {
  await database()
    .collection(USER_COLLECTION)
    .doc(userData.uid)
    .then((docRef) => docRef.set(userData));
}

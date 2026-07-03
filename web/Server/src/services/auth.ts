import { init as initGoogle } from '@/services/auth/google.js';
import { UnAuthError } from '@/model/apperror.js';
import type { AuthUserData } from '@/types/controller.d.ts';
import type { UserData } from '@/types/user.d.ts';

export const AUTH_SUCCESS_REDIRECT_URL = '/';

export function getAuthenticatedSessionUser(userData: UserData | undefined): AuthUserData {
  if (!userData) {
    throw new UnAuthError();
  }
  return { uid: userData.uid };
}

export async function init() {
  await Promise.all([initGoogle()]);
  console.log('Initialized auth service');
}

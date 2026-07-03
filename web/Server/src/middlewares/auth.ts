import { type Request, type Response, type NextFunction } from 'express';
import { UnAuthError } from '@/model/apperror.js';
import type { User } from '@/types/user.d.ts';
import { getUserData, userFromApiKey, userFromUserData } from '@/model/user.js';
import type { Session, SessionData } from 'express-session';

interface SigningTokenPayload {
  uid: string;
}

async function userFromSession(session: Session & Partial<SessionData>): Promise<User | null> {
  if (!session?.user?.uid) {
    return null;
  }

  const destroySession = async () => {
    session.destroy(() => {});
  };
  return userFromUserData(session.user, destroySession, destroySession) ?? null;
}

async function generateSession(user: User): Promise<Partial<SessionData> | null> {
  return await Promise.resolve(user)
    .then(
      (user) =>
        Object({
          uid: user.uid,
        }) as SigningTokenPayload,
    )
    .then(() =>
      Object({
        user: getUserData(user),
      }),
    )
    .catch(() => null);
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // try to authenticate with session (cookies)
  res.locals['user'] = await userFromSession(req.session);
  if (res.locals['user'] !== null) {
    return next();
  }
  req.session.user = undefined;

  const authorization = req.headers.authorization?.replace(/^Bearer /g, '') ?? '';
  if (!authorization) {
    throw new UnAuthError();
  }

  // try to authenticate with api key
  res.locals['user'] = await userFromApiKey(req.params['uid'] ?? '', authorization);
  if (res.locals['user'] !== null) {
    const sessionData = (await generateSession(res.locals['user'])) ?? {};
    Object.assign(req.session, sessionData);
    return next();
  }

  throw new UnAuthError();
}

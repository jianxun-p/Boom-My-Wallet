import 'express-session';

import { UserData } from '@/types/user';

declare module 'express-session' {
  interface SessionData {
    user: UserData;
    token: string;
  }
}

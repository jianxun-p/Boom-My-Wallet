import { createContext, useContext } from 'react';
import type { User } from '../types/user';

export const UserCtx = createContext<User | null>(null);

type UserContext = {
  user: User;
  setUser: (user: Partial<User>) => void;
};

function emptyUser(): User {
  return {
    uid: '',
  };
}

export function useUser(): UserContext {
  const context = useContext(UserCtx);
  return {
    user: Object.assign({}, context ?? emptyUser()),
    setUser: (user: Partial<User>) => {
      Object.assign(context ?? emptyUser(), { ...user });
    },
  };
}

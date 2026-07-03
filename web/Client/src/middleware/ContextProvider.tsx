import '../style.css';
import React, { useEffect, useState } from 'react';
import { UserCtx } from './Context';
import type { User } from '../types/user';
import { useNavigate } from 'react-router';
import { getUser } from '../platforms/BoomMyWallet';

export function UserContext({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let user: User | null = null;
    getUser()
      .then((data) => {
        user = data as User;
        setUser(data as User);
      })
      .catch((e) => {
        console.error('Failed to fetch user:', e);
        const urlParams = new URLSearchParams({
          error: 'Please Sign In.',
        });
        navigate(`/login?${urlParams}`);
      })
      .then(() => {
        if (user === null) return;
      });
  }, [navigate]);

  return <UserCtx.Provider value={user}>{children}</UserCtx.Provider>;
}

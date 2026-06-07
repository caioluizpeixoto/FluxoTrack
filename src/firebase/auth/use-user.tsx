'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, getAuth } from '../compat/auth';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Auth hook error:", err);
      setLoading(false);
    }
  }, []);

  return { user, loading };
}


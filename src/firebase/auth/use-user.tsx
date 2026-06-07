'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../provider';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificação crítica: se o auth não existe (Firebase não configurado), não tenta registrar o listener
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Auth hook error:", err);
      setLoading(false);
    }
  }, [auth]);

  return { user, loading };
}

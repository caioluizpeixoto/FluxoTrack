'use client';

import { useState, useEffect } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const unsubscribe = onSnapshot(
        query,
        (snapshot: QuerySnapshot<T>) => {
          const items = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          } as T & { id: string }));
          setData(items);
          setLoading(false);
        },
        async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: (query as any)._query?.path?.toString() || 'unknown',
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(serverError);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Firestore collection hook error:", err);
      setLoading(false);
    }
  }, [query]);

  return { data, loading, error };
}

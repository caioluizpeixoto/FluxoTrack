'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DocumentReference, mapDbToFields } from '../compat/firestore';

export function useDoc<T = any>(docRef: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const primaryKey = docRef.table === 'profiles' ? 'id' : docRef.table === 'ad_accounts' ? 'account_id' : docRef.table === 'campaigns' ? 'campaign_id' : 'id';

    const fetchData = async () => {
      try {
        const { data: dbData, error: dbError } = await supabase
          .from(docRef.table)
          .select('*')
          .eq(primaryKey, docRef.id)
          .maybeSingle();

        if (dbError) throw dbError;

        const fields = mapDbToFields(docRef.table, dbData);
        setData(fields as T);
        setError(null);
      } catch (err: any) {
        console.error(`Error loading doc from ${docRef.table}:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Filtro para o canal realtime
    const filter = docRef.table === 'profiles' 
      ? `id=eq.${docRef.id}`
      : `${primaryKey}=eq.${docRef.id}`;

    const channel = supabase
      .channel(`doc:${docRef.table}:${docRef.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: docRef.table,
        filter
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setData(null);
        } else {
          const fields = mapDbToFields(docRef.table, payload.new);
          setData(fields as T);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [docRef?.table, docRef?.id]);

  return { data, loading, error };
}


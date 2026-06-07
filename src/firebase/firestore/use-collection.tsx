'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Query, CollectionReference, mapDbToFields } from '../compat/firestore';

export function useCollection<T = any>(queryRef: Query | CollectionReference | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryRef) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = queryRef.type === 'query' ? queryRef.ref : queryRef;
    const constraints = queryRef.type === 'query' ? queryRef.constraints : [];
    
    const table = ref.table;
    const userId = ref.userId;

    const fetchData = async () => {
      try {
        let q = supabase.from(table).select('*');
        
        if (table !== 'profiles' && userId) {
          q = q.eq('user_id', userId);
        }

        constraints.forEach((constraint) => {
          if (constraint.type === 'where') {
            const { field, op, value } = constraint;
            const dbField = mapFieldToDbCol(table, field);
            if (op === '==' || op === '===') {
              if (value === null) {
                q = q.is(dbField, null);
              } else {
                q = q.eq(dbField, value);
              }
            }
          } else if (constraint.type === 'orderBy') {
            const { field, direction } = constraint;
            const dbField = mapFieldToDbCol(table, field);
            q = q.order(dbField, { ascending: direction === 'asc' });
          } else if (constraint.type === 'limit') {
            q = q.limit(constraint.value);
          }
        });

        const { data: dbData, error: dbError } = await q;

        if (dbError) throw dbError;

        const items = (dbData || []).map((row) => mapDbToFields(table, row));
        setData(items as T[]);
        setError(null);
      } catch (err: any) {
        console.error(`Error loading collection ${table}:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const filter = table === 'profiles' ? `id=eq.${userId}` : `user_id=eq.${userId}`;
    const channel = supabase
      .channel(`collection:${table}:${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: table,
        filter: userId ? filter : undefined
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryRef]);

  return { data, loading, error };
}

function mapFieldToDbCol(table: string, field: string): string {
  const fieldMapping: Record<string, string> = {
    displayName: 'display_name',
    metaAccessToken: 'meta_access_token',
    metaConnected: 'meta_connected',
    storeUrl: 'store_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    accountId: 'account_id',
    businessId: 'business_id',
    businessName: 'business_name',
    campaignId: 'campaign_id',
    lastSync: 'last_sync',
    eventType: 'event_type',
    utmSource: 'utm_source',
    utmMedium: 'utm_medium',
    utmCampaign: 'utm_campaign',
    ipAddress: 'ip_address',
    userAgent: 'user_agent',
    externalId: 'external_id',
    attributedCampaignId: 'attributed_campaign_id',
    serverTimestamp: 'timestamp',
    timestamp: 'timestamp',
  };

  return fieldMapping[field] || field;
}


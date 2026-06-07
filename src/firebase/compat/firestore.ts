import { supabase } from '@/lib/supabaseClient';

export interface Firestore {}

export function getFirestore(app?: any): Firestore {
  return {};
}

export interface DocumentReference {
  type: 'doc';
  path: string[];
  table: string;
  id: string;
  userId: string;
}

export interface CollectionReference {
  type: 'collection';
  path: string[];
  table: string;
  userId: string;
}

export type QueryConstraint = 
  | { type: 'where'; field: string; op: string; value: any }
  | { type: 'orderBy'; field: string; direction: 'asc' | 'desc' }
  | { type: 'limit'; value: number };

export interface Query {
  type: 'query';
  ref: CollectionReference;
  constraints: QueryConstraint[];
}

export type DocumentData = any;

const tableMap: Record<string, string> = {
  events: 'tracking_events',
  ad_accounts: 'ad_accounts',
  campaigns: 'campaigns',
  conversions: 'conversions',
  webhooks: 'webhooks',
  users: 'profiles',
};

export function collection(db: Firestore, ...pathSegments: string[]): CollectionReference {
  const collectionName = pathSegments[pathSegments.length - 1];
  const table = tableMap[collectionName] || collectionName;
  const userId = pathSegments[1] || '';
  return {
    type: 'collection',
    path: pathSegments,
    table,
    userId,
  };
}

export function doc(firstParam: any, ...restParams: string[]): DocumentReference {
  if (firstParam && firstParam.type === 'collection') {
    const col = firstParam as CollectionReference;
    const id = restParams[0];
    return {
      type: 'doc',
      path: [...col.path, id],
      table: col.table,
      id,
      userId: col.userId,
    };
  }
  
  const pathSegments = restParams;
  let table = 'profiles';
  let id = '';
  let userId = '';

  if (pathSegments.length === 2 && pathSegments[0] === 'users') {
    table = 'profiles';
    id = pathSegments[1];
    userId = pathSegments[1];
  } else if (pathSegments.length === 4) {
    const colName = pathSegments[2];
    table = tableMap[colName] || colName;
    userId = pathSegments[1];
    id = pathSegments[3];
  }

  return {
    type: 'doc',
    path: pathSegments,
    table,
    id,
    userId,
  };
}

export function query(ref: CollectionReference, ...constraints: QueryConstraint[]): Query {
  return {
    type: 'query',
    ref,
    constraints,
  };
}

export function where(field: string, op: string, value: any): QueryConstraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(value: number): QueryConstraint {
  return { type: 'limit', value };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

// Operações do Banco

export async function getDoc(docRef: DocumentReference) {
  const primaryKey = docRef.table === 'profiles' ? 'id' : docRef.table === 'ad_accounts' ? 'account_id' : docRef.table === 'campaigns' ? 'campaign_id' : 'id';
  const { data, error } = await supabase
    .from(docRef.table)
    .select('*')
    .eq(primaryKey, docRef.id)
    .maybeSingle();

  if (error) throw error;
  
  const fields = mapDbToFields(docRef.table, data);
  return {
    exists: () => !!data,
    data: () => fields,
    id: docRef.id,
  };
}

export async function setDoc(docRef: DocumentReference, data: any, options?: { merge?: boolean }) {
  const primaryKey = docRef.table === 'profiles' ? 'id' : docRef.table === 'ad_accounts' ? 'account_id' : docRef.table === 'campaigns' ? 'campaign_id' : 'id';
  
  const cleanedData = { ...data };
  const payload = {
    [primaryKey]: docRef.id,
    ...cleanedData,
  };

  if (docRef.table !== 'profiles' && docRef.userId) {
    payload.user_id = docRef.userId;
  }

  const dbPayload = mapFieldsToDb(docRef.table, payload);

  const { error } = await supabase
    .from(docRef.table)
    .upsert(dbPayload);

  if (error) throw error;
}

export async function updateDoc(docRef: DocumentReference, data: any) {
  const primaryKey = docRef.table === 'profiles' ? 'id' : docRef.table === 'ad_accounts' ? 'account_id' : docRef.table === 'campaigns' ? 'campaign_id' : 'id';
  const dbPayload = mapFieldsToDb(docRef.table, data);

  const { error } = await supabase
    .from(docRef.table)
    .update(dbPayload)
    .eq(primaryKey, docRef.id);

  if (error) throw error;
}

export async function addDoc(colRef: CollectionReference, data: any) {
  const payload = { ...data };
  if (colRef.userId) {
    payload.user_id = colRef.userId;
  }
  const dbPayload = mapFieldsToDb(colRef.table, payload);

  const { data: insertedData, error } = await supabase
    .from(colRef.table)
    .insert(dbPayload)
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: insertedData?.id || insertedData?.account_id || insertedData?.campaign_id || '',
  };
}

export async function deleteDoc(docRef: DocumentReference) {
  const primaryKey = docRef.table === 'profiles' ? 'id' : docRef.table === 'ad_accounts' ? 'account_id' : docRef.table === 'campaigns' ? 'campaign_id' : 'id';
  const { error } = await supabase
    .from(docRef.table)
    .delete()
    .eq(primaryKey, docRef.id);

  if (error) throw error;
}

// Mapeadores de campos
function mapFieldsToDb(table: string, data: any): any {
  const mapped: any = {};
  
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
    visitorId: 'visitor_id',
    sessionId: 'session_id',
    referrer: 'referrer',
    gclid: 'gclid',
  };

  Object.keys(data).forEach((key) => {
    if (key === 'uid' && table !== 'profiles') {
      mapped['user_id'] = data[key];
    } else if (key === 'uid' && table === 'profiles') {
      mapped['id'] = data[key];
    } else {
      const dbKey = fieldMapping[key] || key;
      mapped[dbKey] = data[key];
    }
  });

  return mapped;
}

export function mapDbToFields(table: string, data: any): any {
  if (!data) return null;
  const mapped: any = {};
  
  const fieldMapping: Record<string, string> = {
    id: 'id',
    display_name: 'displayName',
    meta_access_token: 'metaAccessToken',
    meta_connected: 'metaConnected',
    store_url: 'storeUrl',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    account_id: 'accountId',
    business_id: 'businessId',
    business_name: 'businessName',
    campaign_id: 'campaignId',
    last_sync: 'lastSync',
    event_type: 'eventType',
    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
    ip_address: 'ipAddress',
    user_agent: 'userAgent',
    external_id: 'externalId',
    attributed_campaign_id: 'attributedCampaignId',
    visitor_id: 'visitorId',
    session_id: 'sessionId',
    referrer: 'referrer',
    gclid: 'gclid',
  };

  if (table === 'profiles') {
    mapped['uid'] = data['id'];
  }

  Object.keys(data).forEach((key) => {
    if (key === 'user_id') {
      mapped['uid'] = data[key];
    } else {
      const fieldKey = fieldMapping[key] || key;
      mapped[fieldKey] = data[key];
    }
  });

  return mapped;
}

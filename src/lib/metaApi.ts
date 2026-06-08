/**
 * Meta Marketing API Helper — AdPulse
 * Versão da API: v23.0
 * Toda lógica de chamada à Graph API fica centralizada aqui.
 * NUNCA importe este arquivo em componentes client-side — apenas em API routes.
 */

export const META_API_VERSION = 'v19.0';
export const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Helpers básicos para chamadas
async function fetchMetaApi(endpoint: string, accessToken: string) {
  const url = `${META_BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data;
}

const GRAPH_VERSION = 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ─── Scopes OAuth ─────────────────────────────────────────────────────────────
export const META_SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MetaUser {
  id: string;
  name: string;
  email?: string;
}

export interface MetaBusiness {
  id: string;
  name: string;
  verification_status?: string;
}

export interface MetaAdAccount {
  id: string;               // "act_XXXXXXXXX"
  account_id: string;       // só o número
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;   // 1=ACTIVE, 2=DISABLED, etc.
  business?: { id: string; name: string };
}

export interface MetaPixel {
  id: string;
  name: string;
  creation_time?: string;
}

export interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  reach: string;
  frequency: string;
  purchase_roas?: { action_type: string; value: string }[];
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'this_month'
  | 'last_month'
  | 'maximum';

// ─── URL OAuth ────────────────────────────────────────────────────────────────

/**
 * Gera a URL de autorização OAuth 2.0 do Facebook.
 * Usa exatamente http://localhost:9002/auth/facebook/callback como redirect_uri.
 */
export function buildFacebookOAuthUrl(state?: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI ?? 'http://localhost:9002/auth/facebook/callback';

  if (!appId) {
    throw new Error(
      'FACEBOOK_APP_ID não está definido no .env. Configure a variável e reinicie o servidor.'
    );
  }

  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', META_SCOPES);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('auth_type', 'rerequest'); // força re-autorização se necessário
  if (state) url.searchParams.set('state', state);

  return url.toString();
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

/**
 * Troca o authorization code por um short-lived access token.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; token_type: string; expires_in?: number }> {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI ?? 'http://localhost:9002/auth/facebook/callback';

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data;
}

/**
 * Troca short-lived token por long-lived token (~60 dias).
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; token_type: string; expires_in?: number }> {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data;
}

// ─── Usuário ──────────────────────────────────────────────────────────────────

export async function getMetaMe(token: string): Promise<MetaUser> {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set('fields', 'id,name,email');
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data as MetaUser;
}

// ─── Businesses ───────────────────────────────────────────────────────────────

export async function getMetaBusinesses(token: string): Promise<MetaBusiness[]> {
  const url = new URL(`${GRAPH_BASE}/me/businesses`);
  url.searchParams.set('fields', 'id,name,verification_status');
  url.searchParams.set('access_token', token);
  url.searchParams.set('limit', '50');

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data.data ?? [];
}

// ─── Ad Accounts ─────────────────────────────────────────────────────────────

export async function getMetaAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const url = new URL(`${GRAPH_BASE}/me/adaccounts`);
  url.searchParams.set(
    'fields',
    'id,account_id,name,currency,timezone_name,account_status,business{id,name}'
  );
  url.searchParams.set('access_token', token);
  url.searchParams.set('limit', '50');

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data.data ?? [];
}

// ─── Pixels ───────────────────────────────────────────────────────────────────

export async function getMetaPixels(
  accountId: string,
  token: string
): Promise<MetaPixel[]> {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const url = new URL(`${GRAPH_BASE}/${actId}/adspixels`);
  url.searchParams.set('fields', 'id,name,creation_time');
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    // Sem acesso a pixels não é erro crítico
    console.warn(`[Meta] Pixels inacessíveis para ${accountId}: ${data.error.message}`);
    return [];
  }
  return data.data ?? [];
}

// ─── Campaign Insights ────────────────────────────────────────────────────────

/**
 * Busca insights no nível de campanha para uma ad account.
 */
export async function getCampaignInsights(
  accountId: string,
  token: string,
  datePreset: DatePreset = 'last_30d'
): Promise<MetaInsightRow[]> {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

  const insights = await fetchMetaApi(`${actId}/insights?fields=campaign_id,campaign_name,spend,actions,action_values,cpc,cpm,ctr,impressions,clicks&date_preset=${datePreset}`, token);
  return insights.data || [];
}

/**
 * Busca detalhes financeiros da Conta de Anúncios
 */
export async function getAccountDetails(accountId: string, accessToken: string) {
  // Limpa o prefixo act_ se já vier com ele, ou garante que tenha
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const response = await fetchMetaApi(`${id}?fields=id,name,currency,account_status,balance,amount_spent,spend_cap,timezone_name`, accessToken);
  return response;
}

/**
 * Busca Insights flexíveis para qualquer nível (account, campaign, adset, ad)
 */
export async function getInsights(
  accountId: string, 
  accessToken: string, 
  level: 'account' | 'campaign' | 'adset' | 'ad',
  dateParams: string // ex: '&date_preset=today' ou '&time_range={"since":"2023-01-01","until":"2023-01-31"}'
) {
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  
  // Campos básicos + action_values (vendas) + purchase_roas + cost_per_action_type
  const fields = 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values,purchase_roas';
  
  const url = `${id}/insights?level=${level}&fields=${fields}${dateParams}&limit=500`;
  
  const response = await fetchMetaApi(url, accessToken);
  return response.data || [];
}

// ─── ESTRUTURA (Para exibição no Gerenciador) ────────────────────────────────

export async function getCampaigns(accountId: string, token: string) {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const url = new URL(`${GRAPH_BASE}/${actId}/campaigns`);
  url.searchParams.set('fields', 'id,name,status,daily_budget,lifetime_budget,objective');
  url.searchParams.set('access_token', token);
  url.searchParams.set('limit', '500');
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data.data ?? [];
}

export async function getAdSets(accountId: string, token: string) {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const url = new URL(`${GRAPH_BASE}/${actId}/adsets`);
  url.searchParams.set('fields', 'id,name,status,campaign_id,daily_budget,lifetime_budget');
  url.searchParams.set('access_token', token);
  url.searchParams.set('limit', '500');
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data.data ?? [];
}

export async function getAds(accountId: string, token: string) {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const url = new URL(`${GRAPH_BASE}/${actId}/ads`);
  url.searchParams.set('fields', 'id,name,status,campaign_id,adset_id');
  url.searchParams.set('access_token', token);
  url.searchParams.set('limit', '500');
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return data.data ?? [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function extractAction(
  actions: { action_type: string; value: string }[] | undefined,
  type: string
): number {
  return parseFloat(actions?.find((a) => a.action_type === type)?.value ?? '0');
}

export function extractRoas(
  purchaseRoas: { action_type: string; value: string }[] | undefined
): number {
  return parseFloat(purchaseRoas?.find((r) => r.action_type === 'omni_purchase')?.value ?? '0');
}

// ─── Erro tipado ─────────────────────────────────────────────────────────────

interface GraphApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class MetaApiError extends Error {
  readonly code: number;
  readonly type: string;
  readonly subcode?: number;

  constructor(err: GraphApiError) {
    super(err.message);
    this.name = 'MetaApiError';
    this.code = err.code;
    this.type = err.type;
    this.subcode = err.error_subcode;
  }

  /** Token inválido ou expirado */
  isExpired(): boolean {
    return this.code === 190 || this.subcode === 463 || this.subcode === 467;
  }

  /** Permissão não concedida */
  isPermission(): boolean {
    return this.code === 200 || this.code === 10;
  }

  /** redirect_uri não bate com o cadastrado no App */
  isRedirectUriMismatch(): boolean {
    return this.code === 191;
  }

  /** Mensagem amigável para o usuário */
  userMessage(): string {
    if (this.isExpired())
      return 'Sua sessão do Facebook expirou. Por favor, reconecte sua conta.';
    if (this.isPermission())
      return 'Permissão insuficiente. Reconecte e autorize todos os acessos solicitados.';
    if (this.isRedirectUriMismatch())
      return 'Redirect URI inválido. Verifique se http://localhost:9002/auth/facebook/callback está cadastrado no seu App da Meta.';
    return this.message;
  }
}

// ─── Edição de Anúncios (Management) ─────────────────────────────────────────

export async function updateCampaign(
  campaignId: string,
  token: string,
  updates: { name?: string; status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'; daily_budget?: number; lifetime_budget?: number }
) {
  // A Meta Graph API exige que os parâmetros de mutação (status, budget, etc.)
  // sejam enviados no CORPO do POST, não na URL (query string).
  const body = new URLSearchParams();
  body.set('access_token', token);
  if (updates.name)   body.set('name', updates.name);
  if (updates.status) body.set('status', updates.status);
  if (updates.daily_budget     !== undefined) body.set('daily_budget',     Math.round(updates.daily_budget * 100).toString());
  if (updates.lifetime_budget  !== undefined) body.set('lifetime_budget',  Math.round(updates.lifetime_budget * 100).toString());

  const res = await fetch(`${GRAPH_BASE}/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return { success: true, ...data };
}

export async function updateAdSet(
  adsetId: string,
  token: string,
  updates: { name?: string; status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'; daily_budget?: number; lifetime_budget?: number }
) {
  const body = new URLSearchParams();
  body.set('access_token', token);
  if (updates.name)   body.set('name', updates.name);
  if (updates.status) body.set('status', updates.status);
  if (updates.daily_budget    !== undefined) body.set('daily_budget',    Math.round(updates.daily_budget * 100).toString());
  if (updates.lifetime_budget !== undefined) body.set('lifetime_budget', Math.round(updates.lifetime_budget * 100).toString());

  const res = await fetch(`${GRAPH_BASE}/${adsetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return { success: true, ...data };
}

export async function updateAd(
  adId: string,
  token: string,
  updates: { name?: string; status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }
) {
  const body = new URLSearchParams();
  body.set('access_token', token);
  if (updates.name)   body.set('name', updates.name);
  if (updates.status) body.set('status', updates.status);

  const res = await fetch(`${GRAPH_BASE}/${adId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (data.error) throw new MetaApiError(data.error);
  return { success: true, ...data };
}

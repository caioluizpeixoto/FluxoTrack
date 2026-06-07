import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Instância lazy: o cliente só é criado quando acessado pela primeira vez,
// evitando crash em tempo de avaliação do módulo quando as env vars estão ausentes.
let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn(
          '[Supabase] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas no .env'
        );
        // Retorna uma função que rejeita a Promise para evitar crashes silenciosos
        return () => Promise.reject(new Error('Supabase não configurado. Adicione as variáveis no .env'));
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    const value = (_supabase as any)[prop];
    return typeof value === 'function' ? value.bind(_supabase) : value;
  },
});

/**
 * Retorna uma instância do Supabase com privilégios administrativos.
 * Deve ser utilizada estritamente no lado do servidor (API Routes, Server Actions).
 */
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários para operações administrativas');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

import { supabase } from '@/lib/supabaseClient';

export interface Auth {
  currentUser: User | null;
  onAuthStateChanged: any;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  role?: 'Admin' | 'Editor' | 'Viewer' | null;
  status?: 'approved' | 'pending' | 'rejected' | null;
}

export const getAuth = (app?: any): Auth => {
  return {
    get currentUser() {
      // A maioria dos componentes usa useUser(), mas mantemos compatibilidade básica
      return null;
    },
    onAuthStateChanged: (callback: (user: User | null) => void) => {
      return onAuthStateChanged({} as Auth, callback);
    }
  };
};

export class GoogleAuthProvider {}

export async function signInWithPopup(auth: Auth, provider: any) {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'https://fluxofy.vercel.app/auth/callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    }
  });
  if (error) throw error;
  return { user: null };
}

export async function signOut(auth: Auth) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function createUserWithEmailAndPassword(auth: Auth, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        displayName: email.split('@')[0],
      }
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error('Falha ao criar usuário');
  
  return {
    user: {
      uid: data.user.id,
      email: data.user.email ?? null,
      displayName: (data.user.user_metadata?.displayName || data.user.user_metadata?.name) ?? null,
      emailVerified: false,
    }
  };
}

export async function signInWithEmailAndPassword(auth: Auth, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Usuário não encontrado');

  return {
    user: {
      uid: data.user.id,
      email: data.user.email ?? null,
      displayName: (data.user.user_metadata?.displayName || data.user.user_metadata?.name) ?? null,
      emailVerified: false,
    }
  };
}

export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void) {
  const handleSession = async (session: any) => {
    if (session?.user) {
      const email = session.user.email;
      if (!email) {
        callback(null);
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const isAdminEmail = cleanEmail === 'caioluispeixotos@gmail.com';

      let role: 'Admin' | 'Editor' | 'Viewer' = isAdminEmail ? 'Admin' : 'Viewer';
      let status: 'approved' | 'pending' | 'rejected' = isAdminEmail ? 'approved' : 'pending';

      if (!isAdminEmail) {
        try {
          const res = await fetch(`/api/user/status?email=${encodeURIComponent(cleanEmail)}`);
          if (res.ok) {
            const statusData = await res.json();
            role = statusData.role || 'Viewer';
            status = statusData.status || 'pending';
          }
        } catch (e) {
          console.error('Erro ao verificar status via API:', e);
        }
      }

      callback({
        uid: session.user.id,
        email: session.user.email ?? null,
        displayName: (session.user.user_metadata?.displayName || session.user.user_metadata?.name) ?? null,
        emailVerified: !!session.user.email_confirmed_at,
        role,
        status,
      });
    } else {
      callback(null);
    }
  };

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      callback(null);
      return;
    }
    handleSession(session);
  });

  // Dispara o callback inicial com a sessão atual
  supabase.auth.getSession().then(({ data: { session } }) => {
    handleSession(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

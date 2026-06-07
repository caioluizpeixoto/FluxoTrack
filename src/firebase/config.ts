'use client';

/**
 * Configuração do Firebase utilizando variáveis de ambiente.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

/**
 * Verifica se a configuração básica do Firebase está presente.
 */
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "undefined" && 
    firebaseConfig.apiKey !== "" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "undefined"
  );
};

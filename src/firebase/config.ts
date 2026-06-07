'use client';

/**
 * Configuração do Firebase utilizando as chaves extraídas do seu projeto.
 * Certifique-se de que o provedor de E-mail/Senha está ativo no Console do Firebase.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAL-BP6SgCB_Xjk_-W69m4vz8zYdNqfNHw",
  authDomain: "studio-9464984955-22ae2.firebaseapp.com",
  projectId: "studio-9464984955-22ae2",
  storageBucket: "studio-9464984955-22ae2.firebasestorage.app",
  messagingSenderId: "1065743948256",
  appId: "1:1065743948256:web:644ca51b0b2f26f5d53385"
};

/**
 * Verifica se a configuração básica do Firebase está presente.
 */
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "SUA_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== ""
  );
};

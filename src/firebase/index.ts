'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Inicializa o Firebase de forma segura.
 * Se as configurações estiverem ausentes ou forem inválidas, retorna instâncias nulas
 * para evitar erros de renderização no NextJS (Hydration/Runtime Errors).
 */
export function initializeFirebase() {
  try {
    const isConfigValid = firebaseConfig.apiKey && 
                         firebaseConfig.apiKey !== "" && 
                         firebaseConfig.apiKey !== "undefined";

    if (!isConfigValid) {
      console.warn("Firebase: Chaves de configuração não encontradas. O login e banco de dados estarão desativados.");
      return { 
        app: null as unknown as FirebaseApp, 
        firestore: null as unknown as Firestore, 
        auth: null as unknown as Auth 
      };
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    
    return { app, firestore, auth };
  } catch (error) {
    console.error("Erro crítico ao inicializar Firebase:", error);
    return { 
      app: null as unknown as FirebaseApp, 
      firestore: null as unknown as Firestore, 
      auth: null as unknown as Auth 
    };
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './config';

/**
 * Inicializa o Firebase de forma segura.
 * Retorna instâncias nulas de forma consistente se a configuração for inválida.
 */
export function initializeFirebase() {
  try {
    if (!isFirebaseConfigured()) {
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
    console.error("Erro ao inicializar Firebase:", error);
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
export { isFirebaseConfigured };

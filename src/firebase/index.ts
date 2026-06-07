'use client';

import { getFirestore } from './compat/firestore';
import { getAuth } from './compat/auth';

export function initializeFirebase() {
  return {
    app: {},
    firestore: getFirestore(),
    auth: getAuth(),
  };
}

export const isFirebaseConfigured = () => true;

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';


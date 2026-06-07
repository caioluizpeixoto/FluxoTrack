
'use client';

import React, { ReactNode, useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // Inicializa o Firebase apenas uma vez no lado do cliente
  const { app, firestore, auth } = useMemo(() => initializeFirebase(), []);

  // Se o app não inicializou (por falta de chaves), ainda provemos o contexto
  // para que os hooks não quebrem, mas as operações serão desabilitadas.
  return (
    <FirebaseProvider firebaseApp={app} firestore={firestore} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { getAuth } from './compat/auth';
import { getFirestore } from './compat/firestore';

interface FirebaseContextProps {
  firebaseApp: any;
  firestore: any;
  auth: any;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

export const FirebaseProvider = ({ 
  children, 
  firebaseApp, 
  firestore, 
  auth 
}: FirebaseContextProps & { children: ReactNode }) => {
  return (
    <FirebaseContext.Provider value={{ firebaseApp, firestore, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    return {
      firebaseApp: {},
      firestore: getFirestore(),
      auth: getAuth(),
    };
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useFirestore = () => useFirebase().firestore;
export const useAuth = () => useFirebase().auth;


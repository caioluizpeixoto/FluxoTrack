
'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertCircle, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (err: FirestorePermissionError) => {
      setError(err);
      // Auto-hide after 10 seconds
      setTimeout(() => setError(null), 10000);
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-md animate-in slide-in-from-right-5">
      <Alert variant="destructive" className="bg-destructive text-destructive-foreground border-none shadow-2xl">
        <ShieldAlert className="h-5 w-5" />
        <div className="flex-1">
          <AlertTitle className="font-headline font-bold flex items-center justify-between">
            Acesso Negado (Firestore)
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:bg-white/10" 
              onClick={() => setError(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-2">
            <p>O banco de dados rejeitou a operação de <strong>{error.context.operation}</strong> em:</p>
            <code className="block p-2 bg-black/20 rounded font-mono text-[10px] break-all">
              {error.context.path}
            </code>
            <p className="font-medium">Causa provável: Você precisa estar logado ou as regras de segurança precisam ser atualizadas.</p>
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}

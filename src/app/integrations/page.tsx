import { Suspense } from "react";
import IntegrationsContent from "./IntegrationsContent";
import { Loader2 } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f1115] text-slate-200">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Carregando integrações...</p>
          </div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}

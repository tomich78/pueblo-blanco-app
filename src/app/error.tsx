"use client";

import { Button } from "@/components/Button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold mb-2">
        Algo salió mal
      </h1>
      <p className="text-muted text-sm mb-6">
        Ocurrió un error inesperado. Probá de nuevo en unos segundos.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}

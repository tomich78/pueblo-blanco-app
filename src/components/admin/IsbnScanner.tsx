"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";

type BookData = {
  title: string;
  author: string;
  description: string;
  isbn: string;
  publisher: string;
  coverUrl: string | null;
};

export function IsbnScanner({ onResult }: { onResult: (data: BookData) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"scanning" | "fetching" | "error">("scanning");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    detectedRef.current = false;
    setStatus("scanning");
    setErrorMsg(null);

    let stopped = false;

    (async () => {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      function stopStream() {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const device =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[devices.length - 1];

        if (!device) {
          setErrorMsg("No se encontró ninguna cámara.");
          setStatus("error");
          return;
        }

        await reader.decodeFromVideoDevice(
          device.deviceId,
          videoRef.current!,
          async (result) => {
            if (stopped || detectedRef.current) return;
            if (!result) return;

            detectedRef.current = true;
            const isbn = result.getText();
            setStatus("fetching");
            stopStream();

            try {
              await fetchBookData(isbn);
            } catch {
              setStatus("error");
              setErrorMsg("No encontramos datos para ese ISBN. Ingresalo manualmente.");
            }
          }
        );

        // Guardar el stream del video para poder pararlo
        if (videoRef.current?.srcObject instanceof MediaStream) {
          streamRef.current = videoRef.current.srcObject;
        }
      } catch {
        if (!stopped) {
          setStatus("error");
          setErrorMsg("No se pudo acceder a la cámara. Revisá los permisos.");
        }
      }
    })();

    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  async function fetchBookData(isbn: string) {
    // Open Library API
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const json = await res.json();
    const key = `ISBN:${isbn}`;
    const book = json[key];

    if (!book) {
      // Intentar Google Books como fallback
      const gRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );
      const gJson = await gRes.json();
      const vol = gJson?.items?.[0]?.volumeInfo;

      if (!vol) throw new Error("Not found");

      const data: BookData = {
        title: vol.title ?? "",
        author: vol.authors?.join(", ") ?? "",
        description: vol.description ?? "",
        isbn,
        publisher: vol.publisher ?? "",
        coverUrl: vol.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
      };
      onResult(data);
      setOpen(false);
      return;
    }

    // Open Library encontró el libro
    const authors = (book.authors ?? []).map((a: { name: string }) => a.name).join(", ");
    const description =
      typeof book.description === "string"
        ? book.description
        : book.description?.value ?? "";

    // Portada: Open Library cover o la primera imagen disponible
    const coverUrl =
      book.cover?.medium ??
      book.cover?.large ??
      book.cover?.small ??
      null;

    const publishers = (book.publishers ?? []).map((p: { name: string }) => p.name).join(", ");

    const data: BookData = {
      title: book.title ?? "",
      author: authors,
      description,
      isbn,
      publisher: publishers,
      coverUrl,
    };

    onResult(data);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="w-4 h-4">
          <path d="M3 5h2M3 9h2M3 13h2M7 3v2M11 3v2M15 3v2M7 19v2M11 19v2M15 19v2M19 5h2M19 9h2M19 13h2M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z"/>
        </svg>
        Escanear código de barras
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <p className="font-medium text-sm">
            {status === "scanning" && "Apuntá al código de barras del libro"}
            {status === "fetching" && "Buscando información..."}
            {status === "error" && "Error"}
          </p>
          <button
            onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); setOpen(false); }}
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {status === "scanning" && (
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-square object-cover" />
            {/* Guía visual */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-32 border-2 border-accent rounded-lg opacity-70" />
            </div>
          </div>
        )}

        {status === "fetching" && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted">Consultando base de datos...</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="p-6 text-center">
            <p className="text-sm text-muted mb-4">{errorMsg}</p>
            <Button onClick={() => { detectedRef.current = false; setStatus("scanning"); setErrorMsg(null); }}>
              Intentar de nuevo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

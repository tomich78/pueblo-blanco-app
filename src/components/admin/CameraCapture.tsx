"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";

export function CameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("No se pudo acceder a la cámara. Revisá los permisos."));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `portada-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setOpen(false);
    }, "image/jpeg", 0.92);
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
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Tomar foto
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <p className="font-medium text-sm">Tomar foto de la portada</p>
          <button
            onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); setOpen(false); }}
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[3/4] object-cover"
            />
            <div className="p-4 flex justify-center">
              <button
                type="button"
                onClick={handleCapture}
                className="w-16 h-16 rounded-full bg-accent border-4 border-white shadow-lg active:scale-95 transition-transform"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

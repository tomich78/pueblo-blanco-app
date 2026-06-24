"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function UploadProofForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/pedidos/${orderId}/comprobante`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      setError("No pudimos subir el comprobante. Probá de nuevo.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium">Subir comprobante</label>
      <input
        type="file"
        accept="image/*,application/pdf"
        required
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {error && <p className="text-sm text-accent">{error}</p>}
      <Button type="submit" disabled={uploading || !file} className="w-full">
        {uploading ? "Subiendo..." : "Subir comprobante"}
      </Button>
    </form>
  );
}

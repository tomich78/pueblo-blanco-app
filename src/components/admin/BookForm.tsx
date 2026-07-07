"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { IsbnScanner } from "@/components/admin/IsbnScanner";
import { CameraCapture } from "@/components/admin/CameraCapture";
import type { Category } from "@/lib/types";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

type BookFormValues = {
  id?: string;
  title: string;
  author: string;
  description: string;
  price: number;
  stock: number;
  isbn: string;
  category_id: string | null;
  cover_url: string | null;
  active: boolean;
};

export function BookForm({
  initialValues,
  categories,
  cajasExistentes = [],
}: {
  initialValues: BookFormValues;
  categories: Category[];
  cajasExistentes?: string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cajas, setCajas] = useState<{ caja: string; cantidad: number }[]>([
    { caja: "", cantidad: 1 },
  ]);

  function updateCaja(index: number, field: "caja" | "cantidad", value: string | number) {
    setCajas((cs) =>
      cs.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function addCajaRow() {
    setCajas((cs) => [...cs, { caja: "", cantidad: 1 }]);
  }

  function removeCajaRow(index: number) {
    setCajas((cs) => cs.filter((_, i) => i !== index));
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(path, file);

    if (uploadError) {
      setError("No pudimos subir la imagen.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    setValues((v) => ({ ...v, cover_url: data.publicUrl }));
    setUploading(false);
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  async function handleCameraCapture(file: File) {
    await uploadFile(file);
  }

  async function handleIsbnResult(data: {
    title: string; author: string; description: string; isbn: string; coverUrl: string | null;
  }) {
    setValues((v) => ({
      ...v,
      title: data.title || v.title,
      author: data.author || v.author,
      description: data.description || v.description,
      isbn: data.isbn || v.isbn,
    }));

    // Descargar y subir la portada si viene de la base de datos
    if (data.coverUrl) {
      try {
        setUploading(true);
        const res = await fetch(data.coverUrl);
        const blob = await res.blob();
        const file = new File([blob], `portada-isbn.jpg`, { type: blob.type || "image/jpeg" });
        await uploadFile(file);
      } catch {
        // Si falla la portada no bloqueamos — el resto de datos ya se cargó
        setUploading(false);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      title: values.title,
      author: values.author,
      description: values.description || null,
      price: values.price,
      stock: values.stock,
      isbn: values.isbn || null,
      category_id: values.category_id || null,
      cover_url: values.cover_url,
      active: values.active,
    };

    if (values.id) {
      const { error: saveError } = await supabase
        .from("books")
        .update(payload)
        .eq("id", values.id);

      setSaving(false);

      if (saveError) {
        setError("No pudimos guardar el libro.");
        return;
      }
    } else {
      const { data: newBook, error: saveError } = await supabase
        .from("books")
        .insert(payload)
        .select("id")
        .single();

      if (saveError || !newBook) {
        setSaving(false);
        setError("No pudimos guardar el libro.");
        return;
      }

      const cajasValidas = cajas.filter(
        (c) => c.caja.trim() && c.cantidad > 0
      );
      if (cajasValidas.length) {
        const { error: cajasError } = await supabase
          .from("ubicaciones")
          .insert(
            cajasValidas.map((c) => ({
              producto_id: newBook.id,
              caja: c.caja.trim(),
              cantidad: c.cantidad,
            }))
          );

        if (cajasError) {
          setSaving(false);
          setError(
            "El libro se creó, pero no pudimos guardar la ubicación por caja."
          );
          return;
        }
      }

      setSaving(false);
    }

    router.push("/admin/libros");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">

      {/* Escanear ISBN — solo al crear */}
      {!values.id && (
        <div className="border border-border bg-surface rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-muted">Autocompletar desde código de barras</p>
          <IsbnScanner onResult={handleIsbnResult} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Portada</label>
        <div className="flex items-start gap-4">
          <div className="w-20 h-28 bg-border rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            {values.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.cover_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] text-muted">Sin portada</span>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              disabled={uploading}
              className="text-sm"
            />
            <CameraCapture onCapture={handleCameraCapture} />
            {uploading && <p className="text-xs text-muted">Subiendo imagen...</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Título</label>
        <input
          type="text"
          required
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Autor</label>
        <input
          type="text"
          required
          value={values.author}
          onChange={(e) =>
            setValues((v) => ({ ...v, author: e.target.value }))
          }
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Descripción</label>
        <textarea
          rows={4}
          value={values.description}
          onChange={(e) =>
            setValues((v) => ({ ...v, description: e.target.value }))
          }
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Precio</label>
          <input
            type="number"
            min={0}
            step="any"
            required
            value={values.price}
            onChange={(e) =>
              setValues((v) => ({ ...v, price: Number(e.target.value) }))
            }
            className={`${INPUT} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Stock</label>
          <input
            type="number"
            min={0}
            required
            disabled
            value={values.id ? values.stock : cajas.reduce((s, c) => s + (c.cantidad || 0), 0)}
            className={`${INPUT} opacity-60`}
          />
          <p className="text-xs text-muted">
            Se calcula solo desde la ubicación por caja.
          </p>
        </div>
      </div>

      {!values.id && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Ubicación por caja</label>
          <datalist id="cajas-list">
            {cajasExistentes.map((caja) => (
              <option key={caja} value={caja} />
            ))}
          </datalist>
          <div className="flex flex-col gap-2">
            {cajas.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  list="cajas-list"
                  placeholder="Elegí una caja o escribí una nueva"
                  value={c.caja}
                  onChange={(e) => updateCaja(i, "caja", e.target.value)}
                  className={`${INPUT} flex-1`}
                />
                <input
                  type="number"
                  min={1}
                  value={c.cantidad}
                  onChange={(e) =>
                    updateCaja(i, "cantidad", Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className={`${INPUT} w-20`}
                />
                {cajas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCajaRow(i)}
                    className="text-sm text-accent hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCajaRow}
            className="text-sm text-accent hover:underline self-start"
          >
            + Agregar otra caja
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Categoría</label>
        <select
          value={values.category_id ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, category_id: e.target.value || null }))
          }
          className={INPUT}
        >
          <option value="">Sin categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">ISBN</label>
        <input
          type="text"
          value={values.isbn}
          onChange={(e) => setValues((v) => ({ ...v, isbn: e.target.value }))}
          className={INPUT}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) =>
            setValues((v) => ({ ...v, active: e.target.checked }))
          }
        />
        Visible en el catálogo
      </label>

      {error && <p className="text-sm text-accent">{error}</p>}

      <Button type="submit" disabled={saving || uploading} className="w-full">
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

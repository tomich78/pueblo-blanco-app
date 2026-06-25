"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
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
}: {
  initialValues: BookFormValues;
  categories: Category[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
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

    const { error: saveError } = values.id
      ? await supabase.from("books").update(payload).eq("id", values.id)
      : await supabase.from("books").insert(payload);

    setSaving(false);

    if (saveError) {
      setError("No pudimos guardar el libro.");
      return;
    }

    router.push("/admin/libros");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Portada</label>
        <div className="flex items-center gap-4">
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
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            disabled={uploading}
            className="text-sm"
          />
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
            step="0.01"
            required
            value={values.price}
            onChange={(e) =>
              setValues((v) => ({ ...v, price: Number(e.target.value) }))
            }
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Stock</label>
          <input
            type="number"
            min={0}
            required
            disabled={!!values.id}
            value={values.stock}
            onChange={(e) =>
              setValues((v) => ({ ...v, stock: Number(e.target.value) }))
            }
            className={`${INPUT} ${values.id ? "opacity-60" : ""}`}
          />
          {values.id && (
            <p className="text-xs text-muted">
              Se calcula solo desde la ubicación por caja, abajo.
            </p>
          )}
        </div>
      </div>

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

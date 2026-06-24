"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import type { Category } from "@/lib/types";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: createError } = await supabase
      .from("categories")
      .insert({ name: newName.trim(), slug: slugify(newName) })
      .select()
      .single();

    setSaving(false);

    if (createError || !data) {
      setError("No pudimos crear la categoría (¿el nombre ya existe?).");
      return;
    }

    setCategories((cats) => [...cats, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    router.refresh();
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function handleSaveEdit(id: string) {
    if (!editingName.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("categories")
      .update({ name: editingName.trim(), slug: slugify(editingName) })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      setError("No pudimos actualizar la categoría.");
      return;
    }

    setCategories((cats) =>
      cats.map((c) =>
        c.id === id ? { ...c, name: editingName.trim(), slug: slugify(editingName) } : c
      )
    );
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría? Los libros que la usan quedarán sin categoría.")) {
      return;
    }

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("No pudimos eliminar la categoría.");
      return;
    }

    setCategories((cats) => cats.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nueva categoría"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={`${INPUT} flex-1`}
        />
        <Button type="submit" disabled={saving}>
          Agregar
        </Button>
      </form>

      {error && <p className="text-sm text-accent mb-4">{error}</p>}

      <ul className="flex flex-col gap-2">
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center gap-2 border border-border bg-surface rounded-xl p-3"
          >
            {editingId === cat.id ? (
              <>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className={`${INPUT} flex-1`}
                  autoFocus
                />
                <Button onClick={() => handleSaveEdit(cat.id)} disabled={saving}>
                  Guardar
                </Button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-muted hover:text-accent"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{cat.name}</span>
                <span className="text-xs text-muted">{cat.slug}</span>
                <button
                  onClick={() => startEdit(cat)}
                  className="text-sm text-accent hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="text-sm text-accent hover:underline"
                >
                  Eliminar
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

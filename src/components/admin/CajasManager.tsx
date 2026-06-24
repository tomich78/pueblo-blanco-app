"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent";

type Caja = { id: string; caja: string; cantidad: number };

export function CajasManager({
  bookId,
  initialCajas,
}: {
  bookId: string;
  initialCajas: Caja[];
}) {
  const router = useRouter();
  const [cajas, setCajas] = useState(initialCajas);
  const [nuevaCaja, setNuevaCaja] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCantidad, setEditingCantidad] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = cajas.reduce((sum, c) => sum + c.cantidad, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaCaja.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("ubicaciones")
      .insert({
        producto_id: bookId,
        caja: nuevaCaja.trim(),
        cantidad: nuevaCantidad,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError("No pudimos agregar la caja (¿ya existe esa caja para este libro?).");
      return;
    }

    setCajas((cs) => [...cs, data]);
    setNuevaCaja("");
    setNuevaCantidad(1);
    router.refresh();
  }

  function startEdit(c: Caja) {
    setEditingId(c.id);
    setEditingCantidad(c.cantidad);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("ubicaciones")
      .update({ cantidad: editingCantidad })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      setError("No pudimos actualizar la cantidad.");
      return;
    }

    setCajas((cs) =>
      cs.map((c) => (c.id === id ? { ...c, cantidad: editingCantidad } : c))
    );
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta caja para este libro?")) return;

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("ubicaciones")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("No pudimos eliminar la caja.");
      return;
    }

    setCajas((cs) => cs.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="border border-border bg-surface rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-sm">Ubicación por caja</p>
        <span className="text-xs text-muted">Total: {total}</span>
      </div>

      <ul className="flex flex-col gap-2 mb-3">
        {cajas.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-2 border border-border rounded-lg p-2 text-sm"
          >
            <span className="flex-1">Caja {c.caja}</span>
            {editingId === c.id ? (
              <>
                <input
                  type="number"
                  min={0}
                  value={editingCantidad}
                  onChange={(e) =>
                    setEditingCantidad(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className={`${INPUT} w-20`}
                  autoFocus
                />
                <Button onClick={() => handleSaveEdit(c.id)} disabled={saving}>
                  Guardar
                </Button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-muted hover:text-accent"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="text-muted">{c.cantidad}</span>
                <button
                  onClick={() => startEdit(c)}
                  className="text-xs text-accent hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-accent hover:underline"
                >
                  Eliminar
                </button>
              </>
            )}
          </li>
        ))}
        {cajas.length === 0 && (
          <li className="text-sm text-muted">
            Este libro no tiene ninguna caja asignada todavía.
          </li>
        )}
      </ul>

      {error && <p className="text-sm text-accent mb-2">{error}</p>}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Caja (ej. 12 o SIN-UBICAR)"
          value={nuevaCaja}
          onChange={(e) => setNuevaCaja(e.target.value)}
          className={`${INPUT} flex-1`}
        />
        <input
          type="number"
          min={1}
          value={nuevaCantidad}
          onChange={(e) =>
            setNuevaCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))
          }
          className={`${INPUT} w-20`}
        />
        <Button type="submit" disabled={saving}>
          Agregar
        </Button>
      </form>
    </div>
  );
}

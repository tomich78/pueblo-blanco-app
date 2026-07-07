"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import Link from "next/link";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

type CajaItem = {
  ubicacionId: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  cantidad: number;
};

type Caja = {
  nombre: string;
  totalLibros: number;
  totalEjemplares: number;
  items: CajaItem[];
};

type Book = { id: string; title: string; author: string };

export function CajasView({
  cajas: initialCajas,
  books,
}: {
  cajas: Caja[];
  books: Book[];
}) {
  const [cajas, setCajas] = useState(initialCajas);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Formulario nueva caja
  const [showForm, setShowForm] = useState(false);
  const [newCajaNombre, setNewCajaNombre] = useState("");
  const [newBookId, setNewBookId] = useState("");
  const [newCantidad, setNewCantidad] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = cajas.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!newCajaNombre.trim() || !newBookId) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("ubicaciones")
      .insert({ producto_id: newBookId, caja: newCajaNombre.trim(), cantidad: newCantidad })
      .select("id, caja, cantidad, producto_id, books(id, title, author, cover_url)")
      .single();

    setSaving(false);

    if (insertError) {
      setError("No se pudo crear. ¿Ese libro ya está en esa caja?");
      return;
    }

    type RawBook = { id: string; title: string; author: string; cover_url: string | null };
    const book = Array.isArray(data.books) ? (data.books as RawBook[])[0] : (data.books as RawBook | null);

    const item: CajaItem = {
      ubicacionId: data.id,
      bookId: data.producto_id,
      title: book?.title ?? "Libro",
      author: book?.author ?? "",
      coverUrl: book?.cover_url ?? null,
      cantidad: data.cantidad,
    };

    setCajas((prev) => {
      const existing = prev.find((c) => c.nombre === data.caja);
      if (existing) {
        return prev.map((c) =>
          c.nombre === data.caja
            ? { ...c, totalLibros: c.totalLibros + 1, totalEjemplares: c.totalEjemplares + data.cantidad, items: [...c.items, item] }
            : c
        );
      }
      return [...prev, { nombre: data.caja, totalLibros: 1, totalEjemplares: data.cantidad, items: [item] }]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
    });

    setNewCajaNombre("");
    setNewBookId("");
    setNewCantidad(1);
    setShowForm(false);
    setExpanded(data.caja);
  }

  return (
    <div>
      {/* Barra superior */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar caja..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT} flex-1`}
        />
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nueva caja"}
        </Button>
      </div>

      {/* Formulario nueva caja */}
      {showForm && (
        <form
          onSubmit={handleCrear}
          className="border border-border bg-surface rounded-xl p-4 mb-6 flex flex-col gap-3"
        >
          <p className="font-medium text-sm">Agregar libro a una caja</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Nombre de caja</label>
              <input
                type="text"
                required
                placeholder="ej. 12 o SIN-UBICAR"
                value={newCajaNombre}
                onChange={(e) => setNewCajaNombre(e.target.value)}
                list="cajas-existentes"
                className={INPUT}
              />
              <datalist id="cajas-existentes">
                {cajas.map((c) => <option key={c.nombre} value={c.nombre} />)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Cantidad</label>
              <input
                type="number"
                min={1}
                required
                value={newCantidad}
                onChange={(e) => setNewCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Libro</label>
            <select
              required
              value={newBookId}
              onChange={(e) => setNewBookId(e.target.value)}
              className={INPUT}
            >
              <option value="">Elegir libro...</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.author}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      )}

      {/* Lista de cajas */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted">No hay cajas que coincidan.</p>
        )}
        {filtered.map((caja) => (
          <div key={caja.nombre} className="border border-border rounded-xl overflow-hidden">
            {/* Header de caja */}
            <button
              onClick={() => setExpanded((v) => (v === caja.nombre ? null : caja.nombre))}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-border/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">Caja {caja.nombre}</span>
                <span className="text-xs text-muted">
                  {caja.totalLibros} título{caja.totalLibros !== 1 ? "s" : ""} · {caja.totalEjemplares} ejemplar{caja.totalEjemplares !== 1 ? "es" : ""}
                </span>
              </div>
              <span className="text-muted text-xs">{expanded === caja.nombre ? "▲" : "▼"}</span>
            </button>

            {/* Libros de la caja */}
            {expanded === caja.nombre && (
              <ul className="divide-y divide-border">
                {caja.items.map((item) => (
                  <li key={item.ubicacionId} className="flex items-center gap-3 px-4 py-3">
                    {item.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-8 h-11 object-cover rounded border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-11 bg-border rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/libros/${item.bookId}`}
                        className="text-sm font-medium hover:text-accent truncate block"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted truncate">{item.author}</p>
                    </div>
                    <span className="text-sm font-medium shrink-0">{item.cantidad}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

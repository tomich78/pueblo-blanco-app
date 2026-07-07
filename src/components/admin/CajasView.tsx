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

  // Formulario nueva caja (solo nombre)
  const [showNewCaja, setShowNewCaja] = useState(false);
  const [newCajaNombre, setNewCajaNombre] = useState("");
  const [savingCaja, setSavingCaja] = useState(false);
  const [errorCaja, setErrorCaja] = useState<string | null>(null);

  // Formulario agregar libro a caja existente
  const [addingLibroACaja, setAddingLibroACaja] = useState<string | null>(null);
  const [addBookId, setAddBookId] = useState("");
  const [addCantidad, setAddCantidad] = useState(1);
  const [savingLibro, setSavingLibro] = useState(false);
  const [errorLibro, setErrorLibro] = useState<string | null>(null);

  const filtered = cajas.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCrearCaja(e: React.FormEvent) {
    e.preventDefault();
    const nombre = newCajaNombre.trim();
    if (!nombre) return;
    if (cajas.some((c) => c.nombre === nombre)) {
      setErrorCaja("Ya existe una caja con ese nombre.");
      return;
    }
    setSavingCaja(true);
    setErrorCaja(null);

    const supabase = createClient();
    const { error } = await supabase.from("cajas").insert({ nombre });

    setSavingCaja(false);

    if (error) {
      setErrorCaja("No se pudo crear la caja.");
      return;
    }

    setCajas((prev) =>
      [...prev, { nombre, totalLibros: 0, totalEjemplares: 0, items: [] }]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))
    );
    setNewCajaNombre("");
    setShowNewCaja(false);
    setExpanded(nombre);
  }

  async function handleAgregarLibro(e: React.FormEvent, cajaNombre: string) {
    e.preventDefault();
    if (!addBookId) return;
    setSavingLibro(true);
    setErrorLibro(null);

    // Insertar en cajas también por si la caja vino de ubicaciones y no estaba en la tabla
    const supabase = createClient();
    await supabase.from("cajas").insert({ nombre: cajaNombre }).select().maybeSingle();

    const { data, error } = await supabase
      .from("ubicaciones")
      .insert({ producto_id: addBookId, caja: cajaNombre, cantidad: addCantidad })
      .select("id, cantidad, producto_id, books(id, title, author, cover_url)")
      .single();

    setSavingLibro(false);

    if (error) {
      setErrorLibro("No se pudo agregar. ¿Ese libro ya está en esta caja?");
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

    setCajas((prev) =>
      prev.map((c) =>
        c.nombre === cajaNombre
          ? { ...c, totalLibros: c.totalLibros + 1, totalEjemplares: c.totalEjemplares + data.cantidad, items: [...c.items, item] }
          : c
      )
    );

    setAddBookId("");
    setAddCantidad(1);
    setAddingLibroACaja(null);
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
        <Button onClick={() => { setShowNewCaja((v) => !v); setErrorCaja(null); }}>
          {showNewCaja ? "Cancelar" : "+ Nueva caja"}
        </Button>
      </div>

      {/* Formulario nueva caja (solo nombre) */}
      {showNewCaja && (
        <form
          onSubmit={handleCrearCaja}
          className="border border-border bg-surface rounded-xl p-4 mb-6 flex gap-3 items-end"
        >
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-muted">Nombre de la caja</label>
            <input
              type="text"
              required
              placeholder="ej. 15 o SIN-UBICAR"
              value={newCajaNombre}
              onChange={(e) => setNewCajaNombre(e.target.value)}
              className={INPUT}
              autoFocus
            />
            {errorCaja && <p className="text-xs text-accent">{errorCaja}</p>}
          </div>
          <Button type="submit" disabled={savingCaja}>
            {savingCaja ? "Creando..." : "Crear caja"}
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
            {/* Header */}
            <button
              onClick={() => setExpanded((v) => (v === caja.nombre ? null : caja.nombre))}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-border/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">Caja {caja.nombre}</span>
                <span className="text-xs text-muted">
                  {caja.totalLibros === 0
                    ? "vacía"
                    : `${caja.totalLibros} título${caja.totalLibros !== 1 ? "s" : ""} · ${caja.totalEjemplares} ejemplar${caja.totalEjemplares !== 1 ? "es" : ""}`}
                </span>
              </div>
              <span className="text-muted text-xs">{expanded === caja.nombre ? "▲" : "▼"}</span>
            </button>

            {/* Contenido expandido */}
            {expanded === caja.nombre && (
              <div>
                {caja.items.length > 0 && (
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

                {/* Agregar libro a esta caja */}
                {addingLibroACaja === caja.nombre ? (
                  <form
                    onSubmit={(e) => handleAgregarLibro(e, caja.nombre)}
                    className="px-4 py-3 border-t border-border flex gap-2 items-end"
                  >
                    <div className="flex-1">
                      <select
                        required
                        value={addBookId}
                        onChange={(e) => setAddBookId(e.target.value)}
                        className={`${INPUT} w-full`}
                        autoFocus
                      >
                        <option value="">Elegir libro...</option>
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title} — {b.author}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={addCantidad}
                      onChange={(e) => setAddCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`${INPUT} w-20`}
                    />
                    <Button type="submit" disabled={savingLibro}>
                      {savingLibro ? "..." : "Agregar"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setAddingLibroACaja(null); setErrorLibro(null); }}
                      className="text-sm text-muted hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    {errorLibro && <p className="text-xs text-accent">{errorLibro}</p>}
                  </form>
                ) : (
                  <div className="px-4 py-2 border-t border-border">
                    <button
                      onClick={() => { setAddingLibroACaja(caja.nombre); setAddBookId(""); setAddCantidad(1); setErrorLibro(null); }}
                      className="text-xs text-accent hover:underline"
                    >
                      + Agregar libro a esta caja
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Selección por caja: { [cajaNombre]: Set<ubicacionId> }
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  // Mover selección
  const [movingFrom, setMovingFrom] = useState<string | null>(null);
  const [destCaja, setDestCaja] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Formulario nueva caja
  const [showNewCaja, setShowNewCaja] = useState(false);
  const [newCajaNombre, setNewCajaNombre] = useState("");
  const [savingCaja, setSavingCaja] = useState(false);
  const [errorCaja, setErrorCaja] = useState<string | null>(null);

  // Formulario agregar libro
  const [addingLibroACaja, setAddingLibroACaja] = useState<string | null>(null);
  const [addBookId, setAddBookId] = useState("");
  const [addCantidad, setAddCantidad] = useState(1);
  const [savingLibro, setSavingLibro] = useState(false);
  const [errorLibro, setErrorLibro] = useState<string | null>(null);

  const filtered = cajas.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  // ── Selección ────────────────────────────────────────────────────────────

  function getSelected(cajaNombre: string): Set<string> {
    return selected[cajaNombre] ?? new Set();
  }

  function toggleItem(cajaNombre: string, ubicacionId: string) {
    setSelected((prev) => {
      const s = new Set(prev[cajaNombre] ?? []);
      s.has(ubicacionId) ? s.delete(ubicacionId) : s.add(ubicacionId);
      return { ...prev, [cajaNombre]: s };
    });
  }

  function toggleAll(cajaNombre: string, items: CajaItem[]) {
    setSelected((prev) => {
      const s = prev[cajaNombre] ?? new Set();
      const allSelected = items.every((i) => s.has(i.ubicacionId));
      return {
        ...prev,
        [cajaNombre]: allSelected
          ? new Set()
          : new Set(items.map((i) => i.ubicacionId)),
      };
    });
  }

  function clearSelection(cajaNombre: string) {
    setSelected((prev) => ({ ...prev, [cajaNombre]: new Set() }));
  }

  // ── Mover ────────────────────────────────────────────────────────────────

  async function handleMover(cajaNombre: string) {
    const dest = destCaja.trim();
    if (!dest || dest === cajaNombre) return;

    const sel = getSelected(cajaNombre);
    const caja = cajas.find((c) => c.nombre === cajaNombre);
    if (!caja) return;

    const itemsToMove = caja.items.filter((i) => sel.has(i.ubicacionId));
    if (!itemsToMove.length) return;

    setMoving(true);
    setMoveError(null);

    const supabase = createClient();

    // Asegurar que la caja destino existe en la tabla cajas
    await supabase.from("cajas").insert({ nombre: dest }).select().maybeSingle();

    for (const item of itemsToMove) {
      // Ver si ya existe una fila en la caja destino para este libro
      const { data: existing } = await supabase
        .from("ubicaciones")
        .select("id, cantidad")
        .eq("producto_id", item.bookId)
        .eq("caja", dest)
        .maybeSingle();

      if (existing) {
        // Sumar cantidad
        const { error } = await supabase
          .from("ubicaciones")
          .update({ cantidad: existing.cantidad + item.cantidad })
          .eq("id", existing.id);
        if (error) { setMoveError("Error al mover algunos libros."); setMoving(false); return; }
      } else {
        // Insertar nueva fila en destino
        const { error } = await supabase
          .from("ubicaciones")
          .insert({ producto_id: item.bookId, caja: dest, cantidad: item.cantidad });
        if (error) { setMoveError("Error al mover algunos libros."); setMoving(false); return; }
      }

      // Eliminar fila origen
      await supabase.from("ubicaciones").delete().eq("id", item.ubicacionId);
    }

    setMoving(false);

    // Actualizar estado local
    setCajas((prev) => {
      // Quitar items movidos de la caja origen
      const updated = prev.map((c) => {
        if (c.nombre !== cajaNombre) return c;
        const remaining = c.items.filter((i) => !sel.has(i.ubicacionId));
        const removedEjemplares = itemsToMove.reduce((s, i) => s + i.cantidad, 0);
        return {
          ...c,
          items: remaining,
          totalLibros: remaining.length,
          totalEjemplares: c.totalEjemplares - removedEjemplares,
        };
      });

      // Agregar a caja destino (o crearla si no existe)
      const destExists = updated.some((c) => c.nombre === dest);
      if (destExists) {
        return updated.map((c) => {
          if (c.nombre !== dest) return c;
          let newItems = [...c.items];
          let addedEjemplares = 0;
          for (const item of itemsToMove) {
            const existing = newItems.find((i) => i.bookId === item.bookId);
            if (existing) {
              newItems = newItems.map((i) =>
                i.bookId === item.bookId
                  ? { ...i, cantidad: i.cantidad + item.cantidad, ubicacionId: i.ubicacionId }
                  : i
              );
            } else {
              newItems.push({ ...item, ubicacionId: crypto.randomUUID() });
            }
            addedEjemplares += item.cantidad;
          }
          return {
            ...c,
            items: newItems,
            totalLibros: newItems.length,
            totalEjemplares: c.totalEjemplares + addedEjemplares,
          };
        });
      } else {
        const newCaja: Caja = {
          nombre: dest,
          totalLibros: itemsToMove.length,
          totalEjemplares: itemsToMove.reduce((s, i) => s + i.cantidad, 0),
          items: itemsToMove.map((i) => ({ ...i, ubicacionId: crypto.randomUUID() })),
        };
        return [...updated, newCaja].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { numeric: true })
        );
      }
    });

    clearSelection(cajaNombre);
    setMovingFrom(null);
    setDestCaja("");
  }

  // ── Nueva caja ───────────────────────────────────────────────────────────

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
    if (error) { setErrorCaja("No se pudo crear la caja."); return; }
    setCajas((prev) =>
      [...prev, { nombre, totalLibros: 0, totalEjemplares: 0, items: [] }].sort(
        (a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true })
      )
    );
    setNewCajaNombre("");
    setShowNewCaja(false);
    setExpanded(nombre);
  }

  // ── Agregar libro ────────────────────────────────────────────────────────

  async function handleAgregarLibro(e: React.FormEvent, cajaNombre: string) {
    e.preventDefault();
    if (!addBookId) return;
    setSavingLibro(true);
    setErrorLibro(null);
    const supabase = createClient();
    await supabase.from("cajas").insert({ nombre: cajaNombre }).select().maybeSingle();
    const { data, error } = await supabase
      .from("ubicaciones")
      .insert({ producto_id: addBookId, caja: cajaNombre, cantidad: addCantidad })
      .select("id, cantidad, producto_id, books(id, title, author, cover_url)")
      .single();
    setSavingLibro(false);
    if (error) { setErrorLibro("No se pudo agregar. ¿Ese libro ya está en esta caja?"); return; }
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
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

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted">No hay cajas que coincidan.</p>
        )}

        {filtered.map((caja) => {
          const sel = getSelected(caja.nombre);
          const selCount = sel.size;
          const allSelected = caja.items.length > 0 && caja.items.every((i) => sel.has(i.ubicacionId));
          const isExpanded = expanded === caja.nombre;
          const isMoving = movingFrom === caja.nombre;

          return (
            <div key={caja.nombre} className="border border-border rounded-xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center px-4 py-3 bg-surface gap-3">
                <button
                  onClick={() => {
                    setExpanded((v) => (v === caja.nombre ? null : caja.nombre));
                    if (expanded !== caja.nombre) { setMovingFrom(null); clearSelection(caja.nombre); }
                  }}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <span className="font-medium text-sm">Caja {caja.nombre}</span>
                  <span className="text-xs text-muted">
                    {caja.totalLibros === 0
                      ? "vacía"
                      : `${caja.totalLibros} título${caja.totalLibros !== 1 ? "s" : ""} · ${caja.totalEjemplares} ejemplar${caja.totalEjemplares !== 1 ? "es" : ""}`}
                  </span>
                </button>

                {/* Botones de acción — visibles solo cuando hay items y está expandida */}
                {isExpanded && caja.items.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    {selCount > 0 && !isMoving && (
                      <button
                        onClick={() => { setMovingFrom(caja.nombre); setDestCaja(""); setMoveError(null); }}
                        className="text-xs text-accent hover:underline"
                      >
                        Mover {selCount} {selCount === 1 ? "libro" : "libros"}
                      </button>
                    )}
                    {selCount === 0 && !isMoving && (
                      <button
                        onClick={() => { toggleAll(caja.nombre, caja.items); }}
                        className="text-xs text-muted hover:text-accent"
                      >
                        Seleccionar todo
                      </button>
                    )}
                    {selCount > 0 && !isMoving && (
                      <button
                        onClick={() => clearSelection(caja.nombre)}
                        className="text-xs text-muted hover:text-accent"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                )}

                <span
                  onClick={() => setExpanded((v) => (v === caja.nombre ? null : caja.nombre))}
                  className="text-muted text-xs cursor-pointer"
                >
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {/* Panel de movimiento */}
              {isExpanded && isMoving && (
                <div className="px-4 py-3 bg-surface border-t border-border flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">
                    Mover {selCount} {selCount === 1 ? "libro" : "libros"} a:
                  </span>
                  <datalist id={`dest-cajas-${caja.nombre}`}>
                    {cajas.filter((c) => c.nombre !== caja.nombre).map((c) => (
                      <option key={c.nombre} value={c.nombre} />
                    ))}
                  </datalist>
                  <input
                    type="text"
                    list={`dest-cajas-${caja.nombre}`}
                    placeholder="Caja destino..."
                    value={destCaja}
                    onChange={(e) => setDestCaja(e.target.value)}
                    className={`${INPUT} w-44`}
                    autoFocus
                  />
                  <Button
                    onClick={() => handleMover(caja.nombre)}
                    disabled={moving || !destCaja.trim() || destCaja.trim() === caja.nombre}
                  >
                    {moving ? "Moviendo..." : "Confirmar"}
                  </Button>
                  <button
                    onClick={() => { setMovingFrom(null); setDestCaja(""); clearSelection(caja.nombre); }}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  {moveError && <p className="text-xs text-accent w-full">{moveError}</p>}
                </div>
              )}

              {/* Lista de libros */}
              {isExpanded && (
                <div>
                  {caja.items.length > 0 && (
                    <ul className="divide-y divide-border">
                      {/* Fila "seleccionar todo" con checkbox */}
                      <li className="flex items-center gap-3 px-4 py-2 bg-surface/50">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleAll(caja.nombre, caja.items)}
                          className="w-4 h-4 accent-accent"
                        />
                        <span className="text-xs text-muted">
                          {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                          {selCount > 0 && ` · ${selCount} seleccionado${selCount !== 1 ? "s" : ""}`}
                        </span>
                      </li>

                      {caja.items.map((item) => (
                        <li
                          key={item.ubicacionId}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${sel.has(item.ubicacionId) ? "bg-accent/5" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={sel.has(item.ubicacionId)}
                            onChange={() => toggleItem(caja.nombre, item.ubicacionId)}
                            className="w-4 h-4 accent-accent shrink-0"
                          />
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

                  {/* Agregar libro */}
                  {addingLibroACaja === caja.nombre ? (
                    <form
                      onSubmit={(e) => handleAgregarLibro(e, caja.nombre)}
                      className="px-4 py-3 border-t border-border flex gap-2 items-end flex-wrap"
                    >
                      <div className="flex-1 min-w-40">
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
                      {errorLibro && <p className="text-xs text-accent w-full">{errorLibro}</p>}
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
          );
        })}
      </div>
    </div>
  );
}

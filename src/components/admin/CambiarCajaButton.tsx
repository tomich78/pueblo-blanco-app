"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

type CajaActual = { caja: string; cantidad: number };
type CajaDisponible = { caja: string; cantidad: number };

export function CambiarCajaButton({
  orderItemId,
  bookId,
  quantity,
  cajasActuales,
}: {
  orderItemId: string;
  bookId: string;
  quantity: number;
  cajasActuales: CajaActual[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [disponibles, setDisponibles] = useState<CajaDisponible[]>([]);
  const [asignacion, setAsignacion] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("ubicaciones")
      .select("caja, cantidad")
      .eq("producto_id", bookId)
      .gt("cantidad", 0)
      .order("caja");

    setLoading(false);

    const disp = data ?? [];
    setDisponibles(disp);

    // pre-fill con la asignación actual
    const pre: Record<string, number> = {};
    for (const c of cajasActuales) pre[c.caja] = c.cantidad;
    // para cajas disponibles que no están en la asignación actual, poner 0
    for (const d of disp) {
      if (!(d.caja in pre)) pre[d.caja] = 0;
    }
    setAsignacion(pre);
  }

  function totalAsignado() {
    return Object.values(asignacion).reduce((a, b) => a + b, 0);
  }

  function setVal(caja: string, val: number) {
    setAsignacion((prev) => ({ ...prev, [caja]: val }));
  }

  async function handleGuardar() {
    if (totalAsignado() !== quantity) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();

    // Cajas nuevas con cantidad > 0
    const nuevas = Object.entries(asignacion).filter(([, cant]) => cant > 0);

    // 1. Decrementar nuevas cajas primero (si falla alguna, abortamos)
    for (const [caja, cant] of nuevas) {
      const cajaActual = cajasActuales.find((c) => c.caja === caja);
      const cantidadActual = cajaActual?.cantidad ?? 0;
      const extra = cant - cantidadActual;
      if (extra <= 0) continue; // no necesita más stock de esta caja

      const { error: decErr } = await supabase.rpc("decrement_ubicacion_stock", {
        p_producto_id: bookId,
        p_caja: caja,
        p_cantidad: extra,
      });
      if (decErr) {
        setError(`No hay suficiente stock en Caja ${caja}.`);
        setSaving(false);
        // revertir los decrementos ya hechos
        for (const [c2, cant2] of nuevas) {
          const ca2 = cajasActuales.find((c) => c.caja === c2);
          const extra2 = cant2 - (ca2?.cantidad ?? 0);
          if (extra2 <= 0) break;
          if (c2 === caja) break;
          await supabase.rpc("increment_ubicacion_stock", {
            p_producto_id: bookId,
            p_caja: c2,
            p_cantidad: extra2,
          });
        }
        return;
      }
    }

    // 2. Devolver stock de cajas que se reducen o eliminan
    for (const cajAct of cajasActuales) {
      const nueva = asignacion[cajAct.caja] ?? 0;
      const devolver = cajAct.cantidad - nueva;
      if (devolver <= 0) continue;

      await supabase.rpc("increment_ubicacion_stock", {
        p_producto_id: bookId,
        p_caja: cajAct.caja,
        p_cantidad: devolver,
      });
    }

    // 3. Reemplazar order_item_cajas
    await supabase
      .from("order_item_cajas")
      .delete()
      .eq("order_item_id", orderItemId);

    const rows = nuevas.map(([caja, cantidad]) => ({
      order_item_id: orderItemId,
      caja,
      cantidad,
    }));
    await supabase.from("order_item_cajas").insert(rows);

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const cajasDisponiblesOtras = disponibles.filter(
    (d) => !cajasActuales.some((c) => c.caja === d.caja)
  );
  const hayAlternativa =
    cajasDisponiblesOtras.length > 0 ||
    disponibles.some((d) => {
      const act = cajasActuales.find((c) => c.caja === d.caja);
      return !act || d.cantidad > act.cantidad;
    });

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="text-xs text-accent hover:underline shrink-0"
      >
        Cambiar caja
      </button>
    );
  }

  return (
    <div className="mt-2 border border-border bg-surface rounded-xl p-3 text-sm w-full">
      <p className="font-medium mb-2">Elegí de dónde sacar ({quantity} unidad{quantity !== 1 ? "es" : ""})</p>

      {loading && <p className="text-xs text-muted">Cargando cajas...</p>}

      {!loading && disponibles.length === 0 && (
        <p className="text-xs text-muted">No hay stock disponible en ninguna caja.</p>
      )}

      {!loading && disponibles.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5 mb-3">
            {disponibles.map((d) => {
              const actCant = cajasActuales.find((c) => c.caja === d.caja)?.cantidad ?? 0;
              // stock visible = stock actual en ubicaciones + lo que ya tenemos asignado de esa caja (porque ya fue descontado)
              const stockReal = d.cantidad + actCant;
              const val = asignacion[d.caja] ?? 0;
              return (
                <div key={d.caja} className="flex items-center gap-2">
                  <span className="flex-1 text-muted">
                    Caja {d.caja}
                    <span className="ml-1 text-xs">({stockReal} disponibles)</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={stockReal}
                    value={val}
                    onChange={(e) =>
                      setVal(d.caja, Math.max(0, Math.min(stockReal, parseInt(e.target.value, 10) || 0)))
                    }
                    className="w-16 border border-border rounded-lg px-2 py-1 text-sm bg-surface"
                  />
                </div>
              );
            })}
          </div>

          <p className={`text-xs mb-3 ${totalAsignado() === quantity ? "text-muted" : "text-accent font-medium"}`}>
            Asignado: {totalAsignado()} / {quantity}
          </p>

          {error && <p className="text-xs text-accent mb-2">{error}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleGuardar}
              disabled={saving || totalAsignado() !== quantity}
            >
              {saving ? "Guardando..." : "Confirmar cambio"}
            </Button>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

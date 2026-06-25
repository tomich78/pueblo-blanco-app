import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/Button";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

const PAGE_SIZE = 20;

type SearchParams = { q?: string; page?: string };

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("ventas_historicas")
    .select("id, fecha, email, total, medio_pago, status", { count: "exact" })
    .order("fecha", { ascending: false });

  if (q) {
    query = query.ilike("email", `%${q}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: ventas, count } = await query.range(from, from + PAGE_SIZE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const ventaIds = ventas?.map((v) => v.id) ?? [];
  const emails = [...new Set((ventas ?? []).map((v) => v.email).filter(Boolean))];

  const [{ data: items }, { data: clientes }] = await Promise.all([
    ventaIds.length
      ? supabase
          .from("ventas_historicas_items")
          .select("venta_id, nombre, precio, cantidad")
          .in("venta_id", ventaIds)
      : Promise.resolve({ data: [] }),
    emails.length
      ? supabase
          .from("clientes_historicos")
          .select("email, nombre, telefono, domicilio")
          .in("email", emails)
      : Promise.resolve({ data: [] }),
  ]);

  const itemsPorVenta = new Map<number, { nombre: string; precio: number; cantidad: number }[]>();
  for (const item of items ?? []) {
    const list = itemsPorVenta.get(item.venta_id) ?? [];
    list.push(item);
    itemsPorVenta.set(item.venta_id, list);
  }

  const clientePorEmail = new Map(
    (clientes ?? []).map((c) => [c.email.toLowerCase(), c])
  );

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/historial?${qs}` : "/admin/historial";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold mb-1">
          Historial de ventas (base vieja)
        </h1>
        <p className="text-sm text-muted">
          Compras registradas antes de esta plataforma, solo de referencia.
        </p>
      </div>

      <form className="mb-4 flex gap-2 max-w-sm" action="/admin/historial">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por email..."
          className="flex-1 border border-border bg-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <Button type="submit">Buscar</Button>
      </form>

      {count != null && (
        <p className="text-xs text-muted mb-3">{count} ventas</p>
      )}

      <div className="flex flex-col gap-3">
        {ventas?.map((venta) => {
          const cliente = venta.email
            ? clientePorEmail.get(venta.email.toLowerCase())
            : undefined;
          const itemsVenta = itemsPorVenta.get(venta.id) ?? [];
          return (
            <div
              key={venta.id}
              className="border border-border bg-surface rounded-xl p-4 text-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">
                  {cliente?.nombre ?? venta.email ?? "Sin datos"}
                </p>
                <p className="text-xs text-muted">
                  {venta.fecha ? new Date(venta.fecha).toLocaleDateString("es-AR") : ""}
                </p>
              </div>
              <p className="text-xs text-muted mb-1">
                {venta.email}
                {cliente?.telefono && ` · ${cliente.telefono}`}
                {cliente?.domicilio && ` · ${cliente.domicilio}`}
              </p>
              <ul className="text-xs text-muted mb-2">
                {itemsVenta.map((item, i) => (
                  <li key={i}>
                    {item.cantidad}x {item.nombre} — {formatPrice(item.precio * item.cantidad)}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">{venta.medio_pago} · {venta.status}</span>
                <span className="font-serif font-semibold">{formatPrice(venta.total)}</span>
              </div>
            </div>
          );
        })}
        {ventas?.length === 0 && (
          <p className="text-sm text-muted">No se encontraron ventas.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

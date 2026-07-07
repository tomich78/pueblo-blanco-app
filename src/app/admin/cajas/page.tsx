import { createClient } from "@/lib/supabase/server";
import { CajasView } from "@/components/admin/CajasView";

export default async function CajasPage() {
  const supabase = await createClient();

  const [{ data: cajasList }, { data: ubicaciones }, { data: booksRaw }] = await Promise.all([
    supabase.from("cajas").select("nombre").order("nombre"),
    supabase
      .from("ubicaciones")
      .select("id, caja, cantidad, producto_id, books(id, title, author, cover_url)")
      .order("caja"),
    supabase.from("books").select("id, title, author").eq("active", true).order("title"),
  ]);

  type UbicRow = {
    id: string;
    caja: string;
    cantidad: number;
    producto_id: string;
    books: { id: string; title: string; author: string; cover_url: string | null } | { id: string; title: string; author: string; cover_url: string | null }[] | null;
  };

  // Construir mapa desde ubicaciones
  const cajasMap = new Map<string, { totalLibros: number; totalEjemplares: number; items: { ubicacionId: string; bookId: string; title: string; author: string; coverUrl: string | null; cantidad: number }[] }>();

  for (const u of (ubicaciones ?? []) as unknown as UbicRow[]) {
    const book = Array.isArray(u.books) ? u.books[0] : u.books;
    const entry = cajasMap.get(u.caja) ?? { totalLibros: 0, totalEjemplares: 0, items: [] };
    entry.totalLibros += 1;
    entry.totalEjemplares += u.cantidad;
    entry.items.push({
      ubicacionId: u.id,
      bookId: u.producto_id,
      title: book?.title ?? "Libro",
      author: book?.author ?? "",
      coverUrl: book?.cover_url ?? null,
      cantidad: u.cantidad,
    });
    cajasMap.set(u.caja, entry);
  }

  // Incluir cajas vacías (de la tabla cajas pero sin ubicaciones)
  for (const c of cajasList ?? []) {
    if (!cajasMap.has(c.nombre)) {
      cajasMap.set(c.nombre, { totalLibros: 0, totalEjemplares: 0, items: [] });
    }
  }

  const cajas = Array.from(cajasMap.entries())
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Cajas</h1>
          <p className="text-sm text-muted mt-1">
            {cajas.length} cajas · {cajas.reduce((s, c) => s + c.totalEjemplares, 0)} ejemplares en total
          </p>
        </div>
      </div>

      <CajasView cajas={cajas} books={booksRaw ?? []} />
    </div>
  );
}

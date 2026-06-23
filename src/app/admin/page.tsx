import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-2xl font-semibold mb-2">Panel admin</h1>
      <Link
        href="/admin/libros"
        className="border border-border bg-surface rounded-xl p-4 hover:border-accent"
      >
        <span className="font-medium">Libros</span>
        <p className="text-sm text-muted">
          Crear, editar y dar de baja libros del catálogo.
        </p>
      </Link>
      <Link
        href="/admin/pedidos"
        className="border border-border bg-surface rounded-xl p-4 hover:border-accent"
      >
        <span className="font-medium">Pedidos</span>
        <p className="text-sm text-muted">
          Ver pedidos y confirmar pagos en efectivo/transferencia.
        </p>
      </Link>
    </div>
  );
}

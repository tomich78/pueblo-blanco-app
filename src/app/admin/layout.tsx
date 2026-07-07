import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="flex gap-6 mb-8 border-b border-border pb-4 text-sm font-medium">
        <Link href="/admin/libros" className="hover:text-accent">
          Libros
        </Link>
        <Link href="/admin/pedidos" className="hover:text-accent">
          Pedidos
        </Link>
        <Link href="/admin/categorias" className="hover:text-accent">
          Categorías
        </Link>
        <Link href="/admin/cajas" className="hover:text-accent">
          Cajas
        </Link>
        <Link href="/admin/configuracion" className="hover:text-accent">
          Configuración
        </Link>
        <Link href="/admin/historial" className="hover:text-accent">
          Historial viejo
        </Link>
        <Link href="/" className="text-muted hover:text-accent ml-auto">
          ← Volver al sitio
        </Link>
      </nav>
      {children}
    </div>
  );
}

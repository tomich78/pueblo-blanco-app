"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteBookButton({ bookId }: { bookId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("¿Eliminar este libro? Esta acción no se puede deshacer.")) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("books").delete().eq("id", bookId);

    if (error) {
      alert(
        "No pudimos eliminar el libro (puede tener pedidos asociados). Marcalo como inactivo en su lugar."
      );
      return;
    }

    router.push("/admin/libros");
    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="text-sm text-accent hover:underline">
      Eliminar
    </button>
  );
}

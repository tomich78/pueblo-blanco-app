import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/admin/BookForm";
import { DeleteBookButton } from "@/components/admin/DeleteBookButton";
import { CajasManager } from "@/components/admin/CajasManager";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: book }, { data: categories }, { data: cajas }] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("ubicaciones").select("id, caja, cantidad").eq("producto_id", id).order("caja"),
  ]);

  if (!book) notFound();

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Editar libro</h1>
        <DeleteBookButton bookId={book.id} />
      </div>
      <BookForm
        categories={categories ?? []}
        initialValues={{
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description ?? "",
          price: book.price,
          stock: book.stock,
          isbn: book.isbn ?? "",
          category_id: book.category_id,
          cover_url: book.cover_url,
          active: book.active,
        }}
      />
      <div className="mt-6">
        <CajasManager bookId={book.id} initialCajas={cajas ?? []} />
      </div>
    </div>
  );
}

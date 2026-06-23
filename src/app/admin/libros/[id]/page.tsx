import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/admin/BookForm";
import { DeleteBookButton } from "@/components/admin/DeleteBookButton";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: book }, { data: categories }] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name, slug").order("name"),
  ]);

  if (!book) notFound();

  return (
    <div>
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
    </div>
  );
}

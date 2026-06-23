import { createClient } from "@/lib/supabase/server";
import { BookForm } from "@/components/admin/BookForm";

export default async function NewBookPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Nuevo libro</h1>
      <BookForm
        categories={categories ?? []}
        initialValues={{
          title: "",
          author: "",
          description: "",
          price: 0,
          stock: 0,
          isbn: "",
          category_id: null,
          cover_url: null,
          active: true,
        }}
      />
    </div>
  );
}

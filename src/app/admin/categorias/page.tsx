import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Categorías</h1>
      <CategoryManager initialCategories={categories ?? []} />
    </div>
  );
}

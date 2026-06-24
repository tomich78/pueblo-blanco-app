import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  const supabase = await createClient();

  const { data: books } = await supabase
    .from("books")
    .select("id, created_at")
    .eq("active", true);

  const bookEntries: MetadataRoute.Sitemap = (books ?? []).map((book) => ({
    url: `${siteUrl}/libros/${book.id}`,
    lastModified: book.created_at,
  }));

  return [
    { url: siteUrl, priority: 1 },
    { url: `${siteUrl}/login` },
    { url: `${siteUrl}/registro` },
    ...bookEntries,
  ];
}

import type { Book } from "./types";

// Quita acentos/diacríticos y pasa a minúsculas, para comparar sin importar tildes
export function normalizeText(text: unknown): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type CatalogFilters = {
  q?: string;
  author?: string;
  publisher?: string;
  priceMin?: number;
  priceMax?: number;
  orden?: string;
};

// Búsqueda por palabras (sin acentos) en título + autor + editorial.
// Cada palabra debe aparecer en algún campo, sin importar el orden.
function matchesSearch(book: Book, q: string): boolean {
  const words = normalizeText(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = `${normalizeText(book.title)} ${normalizeText(book.author)} ${normalizeText(book.publisher)}`;
  return words.every((word) => haystack.includes(word));
}

export function filterAndSortBooks(books: Book[], filters: CatalogFilters): Book[] {
  const { q, author, publisher, priceMin, priceMax, orden } = filters;

  let result = books;

  if (q && q.trim()) {
    result = result.filter((b) => matchesSearch(b, q));
  }
  if (author && author.trim()) {
    const a = normalizeText(author);
    result = result.filter((b) => normalizeText(b.author) === a);
  }
  if (publisher && publisher.trim()) {
    const p = normalizeText(publisher);
    result = result.filter((b) => normalizeText(b.publisher) === p);
  }
  if (typeof priceMin === "number" && !Number.isNaN(priceMin)) {
    result = result.filter((b) => Number(b.price) >= priceMin);
  }
  if (typeof priceMax === "number" && !Number.isNaN(priceMax)) {
    result = result.filter((b) => Number(b.price) <= priceMax);
  }

  const byText = (campo: "title" | "author", dir: 1 | -1) =>
    [...result].sort(
      (x, y) => normalizeText(x[campo]).localeCompare(normalizeText(y[campo])) * dir
    );

  switch (orden) {
    case "precio_asc":
      return [...result].sort((x, y) => Number(x.price) - Number(y.price));
    case "precio_desc":
      return [...result].sort((x, y) => Number(y.price) - Number(x.price));
    case "titulo":
      return byText("title", 1);
    case "titulo_desc":
      return byText("title", -1);
    case "autor":
      return byText("author", 1);
    case "autor_desc":
      return byText("author", -1);
    default:
      // Más recientes primero
      return [...result].sort(
        (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      );
  }
}

// Valores únicos (autores / editoriales) para poblar los filtros, sin duplicar por acentos/mayúsculas
export function uniqueValues(books: Book[], campo: "author" | "publisher"): string[] {
  const mapa = new Map<string, string>();
  for (const b of books) {
    const valor = b[campo];
    if (valor && String(valor).trim()) {
      const clave = normalizeText(valor);
      if (!mapa.has(clave)) mapa.set(clave, String(valor).trim());
    }
  }
  return Array.from(mapa.values()).sort((a, b) =>
    normalizeText(a).localeCompare(normalizeText(b))
  );
}

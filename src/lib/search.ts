// Aplica una búsqueda por palabras: cada palabra debe matchear título o autor,
// sin importar el orden ("jorge borges" encuentra lo mismo que "borges jorge").
export function applyBookSearch<T extends { or: (filters: string) => T }>(
  query: T,
  q: string
): T {
  const words = q
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[,()%]/g, ""))
    .filter(Boolean);

  for (const word of words) {
    query = query.or(`title.ilike.%${word}%,author.ilike.%${word}%`);
  }

  return query;
}

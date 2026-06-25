import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  return (
    <nav className="flex items-center justify-center gap-3 mt-10 text-sm">
      <Link
        href={buildHref(prev)}
        aria-disabled={page === 1}
        className={`px-3 py-1.5 rounded-full border border-border ${
          page === 1
            ? "opacity-40 pointer-events-none"
            : "hover:border-accent hover:text-accent"
        }`}
      >
        ← Anterior
      </Link>
      <span className="text-muted">
        Página {page} de {totalPages}
      </span>
      <Link
        href={buildHref(next)}
        aria-disabled={page === totalPages}
        className={`px-3 py-1.5 rounded-full border border-border ${
          page === totalPages
            ? "opacity-40 pointer-events-none"
            : "hover:border-accent hover:text-accent"
        }`}
      >
        Siguiente →
      </Link>
    </nav>
  );
}

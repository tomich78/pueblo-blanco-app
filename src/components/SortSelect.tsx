"use client";

import { useRouter } from "next/navigation";

const ORDENES = [
  { value: "", label: "Más recientes" },
  { value: "precio_asc", label: "Menor precio" },
  { value: "precio_desc", label: "Mayor precio" },
  { value: "titulo", label: "A–Z" },
];

export function SortSelect({
  orden,
  categoria,
  q,
}: {
  orden?: string;
  categoria?: string;
  q?: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    if (e.target.value) params.set("orden", e.target.value);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <select
      value={orden ?? ""}
      onChange={handleChange}
      className="border border-border bg-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
    >
      {ORDENES.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

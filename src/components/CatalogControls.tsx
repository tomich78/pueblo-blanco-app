"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ORDENES = [
  { value: "", label: "Más recientes" },
  { value: "precio_asc", label: "Menor precio" },
  { value: "precio_desc", label: "Mayor precio" },
  { value: "titulo", label: "Título A–Z" },
  { value: "titulo_desc", label: "Título Z–A" },
  { value: "autor", label: "Autor A–Z" },
  { value: "autor_desc", label: "Autor Z–A" },
];

export type CatalogControlsProps = {
  categoria?: string;
  q?: string;
  orden?: string;
  author?: string;
  publisher?: string;
  priceMin?: string;
  priceMax?: string;
  authors: string[];
  publishers: string[];
};

export function CatalogControls(props: CatalogControlsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Construye la URL preservando los filtros actuales, cambiando/borrando algunos
  function buildUrl(cambios: Record<string, string | undefined>) {
    const base: Record<string, string | undefined> = {
      categoria: props.categoria,
      q: props.q,
      orden: props.orden,
      author: props.author,
      publisher: props.publisher,
      precioMin: props.priceMin,
      precioMax: props.priceMax,
    };
    const merged = { ...base, ...cambios };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value && value.trim()) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function go(cambios: Record<string, string | undefined>) {
    router.push(buildUrl(cambios));
  }

  const hayFiltros = Boolean(
    props.author || props.publisher || props.priceMin || props.priceMax
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border border-border bg-surface rounded-lg px-3 py-2 text-sm hover:border-accent"
        >
          ⚙️ Filtros{hayFiltros ? " •" : ""}
        </button>

        <select
          value={props.orden ?? ""}
          onChange={(e) => go({ orden: e.target.value })}
          className="border border-border bg-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        >
          {ORDENES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {open && (
        <div className="mt-4 border border-border rounded-xl bg-surface p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Autor</span>
            <input
              list="lista-autores"
              defaultValue={props.author ?? ""}
              placeholder="Todos"
              onChange={(e) => go({ author: e.target.value || undefined })}
              className="border border-border bg-background rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
            <datalist id="lista-autores">
              {props.authors.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Editorial</span>
            <input
              list="lista-editoriales"
              defaultValue={props.publisher ?? ""}
              placeholder="Todas"
              onChange={(e) => go({ publisher: e.target.value || undefined })}
              className="border border-border bg-background rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
            <datalist id="lista-editoriales">
              {props.publishers.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Precio mínimo</span>
            <input
              type="number"
              inputMode="numeric"
              defaultValue={props.priceMin ?? ""}
              placeholder="0"
              onBlur={(e) => go({ precioMin: e.target.value || undefined })}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                go({ precioMin: (e.target as HTMLInputElement).value || undefined })
              }
              className="border border-border bg-background rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Precio máximo</span>
            <input
              type="number"
              inputMode="numeric"
              defaultValue={props.priceMax ?? ""}
              placeholder="Sin tope"
              onBlur={(e) => go({ precioMax: e.target.value || undefined })}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                go({ precioMax: (e.target as HTMLInputElement).value || undefined })
              }
              className="border border-border bg-background rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
          </label>

          {hayFiltros && (
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="button"
                onClick={() =>
                  go({
                    author: undefined,
                    publisher: undefined,
                    precioMin: undefined,
                    precioMax: undefined,
                  })
                }
                className="text-sm text-accent hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

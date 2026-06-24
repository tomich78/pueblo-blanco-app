import { ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold mb-2">
        Página no encontrada
      </h1>
      <p className="text-muted text-sm mb-6">
        No pudimos encontrar lo que buscás. Puede que el link esté roto o la
        página ya no exista.
      </p>
      <ButtonLink href="/">Volver al catálogo</ButtonLink>
    </main>
  );
}

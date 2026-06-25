import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
        <p>© {new Date().getFullYear()} Pueblo Blanco. Todos los derechos reservados.</p>
        <div className="flex items-center gap-4">
          <Link href="/ayuda" className="hover:text-accent">
            Ayuda
          </Link>
          <Link href="/terminos" className="hover:text-accent">
            Términos y condiciones
          </Link>
        </div>
      </div>
    </footer>
  );
}

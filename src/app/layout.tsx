import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { FloatingCart } from "@/components/FloatingCart";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"
  ),
  title: {
    default: "Pueblo Blanco — Libros para comprar online",
    template: "%s · Pueblo Blanco",
  },
  description:
    "Comprá libros online en Pueblo Blanco. Catálogo de ficción, no ficción e infantiles, pago con Mercado Pago, efectivo o transferencia.",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "Pueblo Blanco — Libros para comprar online",
    description:
      "Comprá libros online en Pueblo Blanco. Catálogo de ficción, no ficción e infantiles.",
    images: ["/logo.png"],
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <Header />
        {children}
        <FloatingCart />
      </body>
    </html>
  );
}

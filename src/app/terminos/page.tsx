export const metadata = { title: "Términos y condiciones" };

export default function TerminosPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-semibold mb-6">
        Términos y condiciones
      </h1>

      <div className="flex flex-col gap-5 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="font-serif text-lg text-foreground font-semibold mb-1">
            1. Sobre Pueblo Blanco
          </h2>
          <p>
            Pueblo Blanco es una librería que vende libros usados y nuevos a
            través de este sitio. Al crear una cuenta o realizar una compra,
            aceptás estos términos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground font-semibold mb-1">
            2. Productos y stock
          </h2>
          <p>
            Los libros publicados están sujetos a disponibilidad. Si por
            algún motivo un libro comprado no está disponible al momento de
            preparar el pedido, te vamos a contactar para coordinar un
            reembolso o un cambio.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground font-semibold mb-1">
            3. Pagos
          </h2>
          <p>
            Aceptamos pagos con Mercado Pago, transferencia bancaria y
            efectivo. Los pagos por transferencia se confirman manualmente
            una vez que subís el comprobante y lo revisamos. Los pagos con
            Mercado Pago se confirman automáticamente.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground font-semibold mb-1">
            4. Envío y retiro
          </h2>
          <p>
            Podés elegir retirar tu pedido en nuestro punto de entrega o
            recibirlo por envío. El costo y la gestión del envío están a
            cargo del comprador; nos vamos a comunicar para coordinar los
            detalles después de la compra.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground font-semibold mb-1">
            5. Datos personales
          </h2>
          <p>
            Usamos tus datos (nombre, email, teléfono y dirección) únicamente
            para procesar tu pedido y comunicarnos con vos. No los
            compartimos con terceros salvo lo necesario para procesar pagos
            (Mercado Pago) o envíos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground font-semibold mb-1">
            6. Contacto
          </h2>
          <p>
            Cualquier consulta sobre tu pedido o estos términos, escribinos a{" "}
            <a
              href="mailto:puebloblanco22@gmail.com"
              className="text-accent hover:underline"
            >
              puebloblanco22@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

export const metadata = { title: "Ayuda" };

const FAQS = [
  {
    q: "¿Cómo compro un libro?",
    a: "Elegí el libro del catálogo y apretá \"Agregar al carrito\", o entrá al detalle para elegir cantidad. Cuando termines, andá al carrito y seguí los pasos del checkout: invitado o con cuenta, retiro o envío, y el método de pago.",
  },
  {
    q: "¿Necesito crear una cuenta para comprar?",
    a: "No, podés comprar como invitado. Si comprás con cuenta vas a poder ver el historial de tus pedidos en \"Mi cuenta\".",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Tarjeta a través de Mercado Pago, transferencia bancaria (subiendo el comprobante) o efectivo a coordinar.",
  },
  {
    q: "Pagué por transferencia, ¿y ahora?",
    a: "Subí el comprobante desde la página de tu pedido (te queda guardado el link, o podés buscarlo en \"Mi pedido\" con el número y tu email). Una vez que lo revisemos, tu pedido pasa a \"Pagado\".",
  },
  {
    q: "¿Cómo retiro o recibo mi pedido?",
    a: "Al comprar elegís retiro en nuestro punto de entrega o envío a tu domicilio. Si es envío, el costo está a cargo del comprador y nos comunicamos para coordinarlo.",
  },
  {
    q: "Perdí el link de mi pedido, ¿cómo lo encuentro?",
    a: "Entrá a \"Mi pedido\" desde el menú e ingresá el número de pedido (te llega por email) junto con tu email de compra.",
  },
];

export default function AyudaPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-semibold mb-6">
        Ayuda y preguntas frecuentes
      </h1>

      <div className="flex flex-col gap-4 mb-10">
        {FAQS.map((item) => (
          <div
            key={item.q}
            className="border border-border bg-surface rounded-xl p-4"
          >
            <p className="font-medium mb-1">{item.q}</p>
            <p className="text-sm text-muted">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="border border-border bg-surface rounded-xl p-4">
        <h2 className="font-serif text-lg font-semibold mb-1">
          ¿No encontraste lo que buscabas?
        </h2>
        <p className="text-sm text-muted">
          Escribinos a{" "}
          <a
            href="mailto:puebloblanco22@gmail.com"
            className="text-accent hover:underline"
          >
            puebloblanco22@gmail.com
          </a>{" "}
          y te respondemos a la brevedad.
        </p>
      </div>
    </main>
  );
}

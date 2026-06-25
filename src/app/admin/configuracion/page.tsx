function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${
        ok ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-accent/10 text-accent"
      }`}
    >
      {ok ? "Conectado" : "No configurado"}
    </span>
  );
}

export default function AdminConfiguracionPage() {
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const mpMode = mpToken?.startsWith("APP_USR-")
    ? "Producción"
    : mpToken?.startsWith("TEST-")
    ? "Prueba"
    : null;
  const mpLast4 = mpToken ? mpToken.slice(-4) : null;

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl font-semibold mb-6">Configuración</h1>

      <div className="border border-border bg-surface rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Mercado Pago</p>
          <StatusBadge ok={!!mpToken} />
        </div>
        {mpToken ? (
          <dl className="flex flex-col gap-1 text-sm text-muted">
            <div className="flex justify-between">
              <dt>Modo</dt>
              <dd className="font-medium text-foreground">
                {mpMode ?? "Desconocido"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Token</dt>
              <dd className="font-medium text-foreground">···{mpLast4}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">
            No hay credenciales de Mercado Pago configuradas.
          </p>
        )}
      </div>

      <div className="border border-border bg-surface rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Email (Resend)</p>
          <StatusBadge ok={!!resendKey} />
        </div>
        {resendKey ? (
          <dl className="flex flex-col gap-1 text-sm text-muted">
            <div className="flex justify-between">
              <dt>Remitente</dt>
              <dd className="font-medium text-foreground">
                {emailFrom ?? "(no configurado)"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Avisos de admin a</dt>
              <dd className="font-medium text-foreground">
                {adminEmail ?? "(no configurado)"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">
            No hay API key de Resend configurada. No se están enviando
            emails automáticos.
          </p>
        )}
      </div>

      <p className="text-sm text-muted">
        Para cambiar estos valores, contactá a tu desarrollador.
      </p>
    </div>
  );
}

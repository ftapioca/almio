const pillars = [
  'Multi-tenant por schema PostgreSQL',
  'PWA offline-first para POS y asistencia',
  'RBAC server-side y auditoría',
  'OWASP ASVS Level 2 como objetivo de producción',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="hero-shell mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">
            Almio · Fase 0
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Base del SaaS de RRHH, asistencia, turnos, caja y POS.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted">
            Esta base refleja la arquitectura y alcance definidos en SoW, SDD y
            SRS. El repositorio queda preparado para construir el MVP por fases.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((pillar) => (
            <div
              key={pillar}
              className="rounded-[24px] border border-border/80 bg-surface/90 p-5 shadow-card backdrop-blur"
            >
              <p className="text-sm font-medium">{pillar}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-border/80 bg-surface/95 p-6 shadow-card backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Backoffice interno
              </p>
              <h2 className="text-2xl font-semibold">
                Scopes por sucursal listos para operación manual.
              </h2>
              <p className="text-sm leading-6 text-muted">
                Antes de abrir la UI de asistencia y turnos, ya existe una consola
                mínima para consultar y reemplazar `branch_membership_scopes`
                sobre el contrato admin actual.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/backoffice/attendance"
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Attendance UI
              </a>
              <a
                href="/backoffice/branch-scopes"
                className="inline-flex h-12 items-center justify-center rounded-full border border-brand/30 bg-brand/8 px-6 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-brand/12"
              >
                Scopes Console
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

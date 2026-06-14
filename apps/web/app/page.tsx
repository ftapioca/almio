const pillars = [
  'Multi-tenant por schema PostgreSQL',
  'PWA offline-first para POS y asistencia',
  'RBAC server-side y auditoría',
  'OWASP ASVS Level 2 como objetivo de producción',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-normal text-brand">
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
              className="rounded-lg border border-border bg-surface p-5"
            >
              <p className="text-sm font-medium">{pillar}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

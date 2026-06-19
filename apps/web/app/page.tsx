import Link from 'next/link';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from '@almio/design-system';

const pillars = [
  'Multi-tenant por schema PostgreSQL',
  'PWA offline-first para POS y asistencia',
  'RBAC server-side y auditoría',
  'OWASP ASVS Level 2 como objetivo de producción',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="hero-shell mx-auto flex min-h-screen max-w-[1280px] flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <Badge variant="info" className="px-3 py-1 text-caption uppercase tracking-[0.18em]">
            Almio · Fase 0
          </Badge>
          <h1 className="text-h2 text-foreground sm:text-h1">
            Base del SaaS de RRHH, asistencia, turnos, caja y POS.
          </h1>
          <p className="max-w-2xl text-body text-muted-foreground">
            Esta base refleja la arquitectura y alcance definidos en SoW, SDD y
            SRS. El repositorio queda preparado para construir el MVP por fases.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((pillar) => (
            <Card key={pillar}>
              <CardContent className="p-5">
                <p className="text-body-sm font-medium">{pillar}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-elevation-2">
          <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <Badge variant="info" className="px-3 py-1 text-caption uppercase tracking-[0.2em]">
                Backoffice interno
              </Badge>
              <CardTitle className="text-h4">
                Scopes por sucursal listos para operación manual.
              </CardTitle>
              <CardDescription className="text-body-sm leading-6">
                Antes de abrir la UI de asistencia y turnos, ya existe una consola
                mínima para consultar y reemplazar `branch_membership_scopes`
                sobre el contrato admin actual.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/backoffice/attendance" className={buttonVariants({ size: 'lg' })}>
                Attendance UI
              </Link>
              <Link
                href="/backoffice/shifts"
                className={buttonVariants({ size: 'lg', variant: 'secondary' })}
              >
                Shifts UI
              </Link>
              <Link
                href="/backoffice/branch-scopes"
                className={buttonVariants({ size: 'lg', variant: 'outline' })}
              >
                Scopes Console
              </Link>
            </div>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}

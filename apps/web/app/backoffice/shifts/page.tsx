import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getApiBaseUrl } from '../../../lib/server-env';
import { SignOutButton } from '../branch-scopes/sign-out-button';
import { ShiftsConsole } from './shifts-console';

export default async function ShiftsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect('/auth/login?next=/backoffice/shifts');
  }

  const { data: userResult } = await supabase.auth.getUser();
  const currentUserEmail = userResult.user?.email ?? 'unknown-user';
  const apiBaseUrl = getApiBaseUrl();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
          <div className="rounded-[30px] border border-border/70 bg-ink p-8 text-white shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sand">
                  Almio Backoffice
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/backoffice/attendance"
                    className="inline-flex h-9 items-center justify-center rounded-full border border-white/16 bg-white/8 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78 transition hover:bg-white/12"
                  >
                    Attendance
                  </Link>
                  <Link
                    href="/backoffice/shifts"
                    className="inline-flex h-9 items-center justify-center rounded-full bg-white/14 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-sand"
                  >
                    Shifts
                  </Link>
                  <Link
                    href="/backoffice/branch-scopes"
                    className="inline-flex h-9 items-center justify-center rounded-full border border-white/16 bg-white/8 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78 transition hover:bg-white/12"
                  >
                    Branch Scopes
                  </Link>
                </div>
              </div>

              <SignOutButton />
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight">
              Turnos operativos sobre el contrato real de shifts.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
              Esta pantalla consume `GET|POST|PATCH /v1/shifts` y los comandos
              `publish`, `cancel` y `complete` sin relajar la máquina de estados
              del backend.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[24px] border border-white/12 bg-white/6 p-5">
                <p className="text-sm font-semibold text-sand">Contratos fijos</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Estados válidos: `SCHEDULED`, `PUBLISHED`, `CANCELLED`,
                  `COMPLETED`. La UI no intenta mutar `status` vía `PATCH`; usa
                  sólo comandos explícitos.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/12 bg-white/6 p-5">
                <p className="text-sm font-semibold text-sand">Uso previsto</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Filtrar turnos, crear nuevos turnos, ajustar datos
                  estructurales permitidos y ejecutar transiciones de estado
                  operativas desde la misma consola.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/12 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand">
                Sesion activa
              </p>
              <p className="mt-2 break-all text-sm text-white/78">{currentUserEmail}</p>
            </div>
          </div>

          <ShiftsConsole initialApiBaseUrl={apiBaseUrl} initialTenantId="almio" />
        </div>
      </section>
    </main>
  );
}

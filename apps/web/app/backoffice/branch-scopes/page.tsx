import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { BranchScopesConsole } from './scopes-console';
import { SignOutButton } from './sign-out-button';

export default async function BranchScopesPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect('/auth/login?next=/backoffice/branch-scopes');
  }

  const { data: userResult } = await supabase.auth.getUser();
  const currentUserEmail = userResult.user?.email ?? 'unknown-user';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="rounded-[30px] border border-border/70 bg-ink p-8 text-white shadow-card">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sand">
                Almio Backoffice
              </p>
              <SignOutButton />
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Administracion de scopes por sucursal.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
              Esta consola usa `GET|PUT /v1/admin/branch-membership-scopes` para
              operar `BRANCH_ADMIN` sin depender de scripts. Se mantiene manual a
              proposito hasta cerrar auth web y shell SaaS.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[24px] border border-white/12 bg-white/6 p-5">
                <p className="text-sm font-semibold text-sand">Uso previsto</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Buscar una membership, revisar las sucursales asignadas y
                  reemplazar el scope completo con una lista nueva.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/12 bg-white/6 p-5">
                <p className="text-sm font-semibold text-sand">Requisitos</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                `Authorization Bearer`, `X-Tenant-ID`, `membershipId` y la URL
                  base de la API. La sesión ya viene desde Supabase Auth.
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

          <BranchScopesConsole initialTenantId="almio" />
        </div>
      </section>
    </main>
  );
}

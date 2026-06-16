import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { LoginForm } from './login-form';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPathValue = params.next;
  const nextPath =
    typeof nextPathValue === 'string' && nextPathValue.startsWith('/')
      ? nextPathValue
      : '/backoffice/branch-scopes';

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-border/80 bg-ink p-8 text-white shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sand">
              Supabase Auth
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Acceso real al backoffice Almio.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
              Esta capa ya usa la sesion real de Supabase para proteger el
              backoffice y exponer el `Bearer token` que necesita la consola
              administrativa mientras el shell SaaS aun no existe.
            </p>
          </div>

          <div className="rounded-[32px] border border-border/80 bg-surface/95 p-8 shadow-card backdrop-blur">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Login
              </p>
              <h2 className="text-2xl font-semibold">Iniciar sesion</h2>
              <p className="text-sm leading-6 text-muted">
                Usa una cuenta existente en Supabase Auth para entrar al
                backoffice.
              </p>
            </div>

            <div className="mt-8">
              <LoginForm nextPath={nextPath} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

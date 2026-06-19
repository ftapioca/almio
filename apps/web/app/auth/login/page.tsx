import { redirect } from 'next/navigation';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@almio/design-system';
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
      : '/backoffice';

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-[1280px] items-center px-6 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-sidebar-border bg-sidebar text-sidebar-foreground shadow-elevation-3">
            <CardHeader className="p-8">
              <Badge variant="info" className="w-fit bg-primary-100 text-primary-700">
                Supabase Auth
              </Badge>
              <CardTitle className="mt-4 text-h3 text-white">
              Acceso real al backoffice Almio.
              </CardTitle>
              <CardDescription className="mt-2 max-w-xl text-body-sm leading-7 text-white/76">
              Esta capa ya usa la sesion real de Supabase para proteger el
              backoffice y exponer el `Bearer token` que necesita la consola
              administrativa mientras el shell SaaS aun no existe.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-elevation-2">
            <CardHeader className="p-8">
              <div className="space-y-2">
                <Badge variant="info" className="w-fit">
                  Login
                </Badge>
                <CardTitle className="text-h4">Iniciar sesión</CardTitle>
                <CardDescription className="text-body-sm leading-6">
                Usa una cuenta existente en Supabase Auth para entrar al
                backoffice.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-0">
              <LoginForm nextPath={nextPath} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

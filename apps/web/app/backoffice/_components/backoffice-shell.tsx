import Link from 'next/link';
import { ReactNode } from 'react';
import { Badge, Card, CardDescription, CardHeader, CardTitle, buttonVariants } from '@almio/design-system';
import { SignOutButton } from '../branch-scopes/sign-out-button';
import { BackofficeClientContextProvider } from './backoffice-client-context';
import { BackofficeContextPanel } from './backoffice-context-panel';

type BackofficeNavKey = 'home' | 'attendance' | 'shifts' | 'branch-scopes';

const navItems: Array<{
  href: string;
  key: BackofficeNavKey;
  label: string;
}> = [
  {
    href: '/backoffice',
    key: 'home',
    label: 'Home',
  },
  {
    href: '/backoffice/attendance',
    key: 'attendance',
    label: 'Attendance',
  },
  {
    href: '/backoffice/shifts',
    key: 'shifts',
    label: 'Shifts',
  },
  {
    href: '/backoffice/branch-scopes',
    key: 'branch-scopes',
    label: 'Branch Scopes',
  },
];

export function BackofficeShell({
  activeSection,
  apiBaseUrl,
  currentUserEmail,
  tenantId,
  title,
  description,
  highlightCards,
  children,
}: {
  activeSection: BackofficeNavKey;
  apiBaseUrl: string;
  currentUserEmail: string;
  tenantId: string;
  title: string;
  description: string;
  highlightCards: Array<{ title: string; body: string }>;
  children: ReactNode;
}) {
  return (
    <BackofficeClientContextProvider apiBaseUrl={apiBaseUrl} initialTenantId={tenantId}>
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-8 px-6 py-10">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
            <aside className="rounded-2xl border border-sidebar-border bg-sidebar p-8 text-sidebar-foreground shadow-elevation-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="info" className="bg-primary-100 text-primary-700">
                    Almio Backoffice
                  </Badge>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {navItems.map((item) => {
                      const isActive = item.key === activeSection;

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={buttonVariants({
                            size: 'sm',
                            variant: isActive ? 'default' : 'outline',
                            className: isActive
                              ? 'bg-primary text-white hover:bg-primary-600'
                              : 'border-white/16 bg-white/8 text-white hover:bg-white/12 hover:text-white',
                          })}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <SignOutButton />
              </div>

              <h1 className="mt-6 text-h3 text-white">{title}</h1>
              <p className="mt-4 max-w-xl text-body-sm leading-7 text-white/76">
                {description}
              </p>

              <div className="mt-8 grid gap-4">
                {highlightCards.map((card) => (
                  <Card
                    key={card.title}
                    className="border-white/12 bg-white/6 text-white shadow-none"
                  >
                    <CardHeader className="p-5">
                      <CardTitle className="text-body font-semibold text-white">{card.title}</CardTitle>
                      <CardDescription className="text-body-sm leading-6 text-white/72">
                        {card.body}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <Card className="mt-8 border-white/12 bg-white/6 text-white shadow-none">
                <CardHeader className="p-5">
                  <CardDescription className="text-caption font-semibold uppercase tracking-[0.18em] text-primary-100">
                    Sesión activa
                  </CardDescription>
                  <CardTitle className="break-all text-body-sm font-medium text-white/78">
                    {currentUserEmail}
                  </CardTitle>
                </CardHeader>
              </Card>
            </aside>

            <div>
              <BackofficeContextPanel />
              {children}
            </div>
          </div>
        </section>
      </main>
    </BackofficeClientContextProvider>
  );
}

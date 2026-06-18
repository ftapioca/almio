import Link from 'next/link';
import { ReactNode } from 'react';
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
        <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
            <aside className="rounded-[30px] border border-border/70 bg-ink p-8 text-white shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sand">
                    Almio Backoffice
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {navItems.map((item) => {
                      const isActive = item.key === activeSection;

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={
                            isActive
                              ? 'inline-flex h-9 items-center justify-center rounded-full bg-white/14 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-sand'
                              : 'inline-flex h-9 items-center justify-center rounded-full border border-white/16 bg-white/8 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78 transition hover:bg-white/12'
                          }
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <SignOutButton />
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight">{title}</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
                {description}
              </p>

              <div className="mt-8 grid gap-4">
                {highlightCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[24px] border border-white/12 bg-white/6 p-5"
                  >
                    <p className="text-sm font-semibold text-sand">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[24px] border border-white/12 bg-white/6 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand">
                  Sesion activa
                </p>
                <p className="mt-2 break-all text-sm text-white/78">{currentUserEmail}</p>
              </div>
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

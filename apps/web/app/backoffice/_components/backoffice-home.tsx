'use client';

import Link from 'next/link';
import { useBackofficeContext } from './backoffice-client-context';

const modules = [
  {
    href: '/backoffice/attendance',
    label: 'Attendance',
    description:
      'Registrar marcaciones manuales, revisar últimos eventos y probar secuencias reales del contrato.',
  },
  {
    href: '/backoffice/shifts',
    label: 'Shifts',
    description:
      'Crear turnos, ajustar datos estructurales y ejecutar comandos publish, cancel y complete.',
  },
  {
    href: '/backoffice/branch-scopes',
    label: 'Branch Scopes',
    description:
      'Consultar memberships y reemplazar el scope completo de sucursales para BRANCH_ADMIN.',
  },
];

export function BackofficeHome() {
  const { me, branches, activeBranchId } = useBackofficeContext();

  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
  const scopedBranchCount = me?.user?.branchScopeIds.length ?? 0;

  return (
    <div className="grid gap-6">
      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Inicio operativo
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
            Entrada única al backoffice funcional actual.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Este panel ya comparte sesión, tenant y sucursal activa. Sirve como
            punto base para operar mientras el design system definitivo sigue en
            construcción.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label="Roles efectivos"
          value={me?.user?.roles.join(', ') || 'Sin roles'}
          detail={`membership: ${me?.user?.membershipId ?? 'n/a'}`}
        />
        <StatCard
          label="Scope de sucursales"
          value={scopedBranchCount > 0 ? `${scopedBranchCount} sucursal(es)` : 'Sin restricción'}
          detail="Basado en /v1/me y branchScopeIds"
        />
        <StatCard
          label="Sucursal activa"
          value={activeBranch ? `${activeBranch.code} · ${activeBranch.name}` : 'Sin seleccionar'}
          detail={activeBranch?.timezone ?? 'Selecciona una sucursal desde el panel superior'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {modules.map((module) => (
          <div
            key={module.href}
            className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur"
          >
            <p className="text-sm font-semibold text-foreground">{module.label}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{module.description}</p>
            <Link
              href={module.href}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Abrir módulo
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

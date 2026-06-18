'use client';

import { useBackofficeContext } from './backoffice-client-context';

export function BackofficeContextPanel() {
  const {
    tenantId,
    me,
    branches,
    activeBranchId,
    setActiveBranchId,
    isLoading,
    error,
  } = useBackofficeContext();

  const scopedBranchIds = me?.user?.branchScopeIds ?? [];
  const availableBranches =
    scopedBranchIds.length > 0
      ? branches.filter((branch) => scopedBranchIds.includes(branch.id))
      : branches;

  return (
    <div className="mb-6 rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr_1fr]">
        <div className="rounded-[20px] border border-border/70 bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Tenant activo
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">{tenantId}</p>
          <p className="mt-2 text-sm text-muted">
            {me?.tenant?.schemaName ?? 'Cargando schema tenant...'}
          </p>
        </div>

        <div className="rounded-[20px] border border-border/70 bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Contexto de acceso
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {me?.user?.roles.join(', ') || 'Sin roles cargados'}
          </p>
          <p className="mt-2 break-all text-sm text-muted">
            membership: {me?.user?.membershipId ?? 'n/a'}
          </p>
        </div>

        <label className="grid gap-2 rounded-[20px] border border-border/70 bg-panel p-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Sucursal activa
          </span>
          <select
            className="field-input"
            value={activeBranchId}
            onChange={(event) => setActiveBranchId(event.target.value)}
            disabled={isLoading || availableBranches.length === 0}
          >
            <option value="">Sin seleccionar</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} · {branch.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">
            {scopedBranchIds.length > 0
              ? `Scope efectivo: ${scopedBranchIds.length} sucursal(es)`
              : 'Sin restricción por scope en esta sesión'}
          </p>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] border border-danger/30 bg-danger/8 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}
    </div>
  );
}

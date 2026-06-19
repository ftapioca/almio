'use client';

import { Alert, AlertDescription, Card, CardContent, Input, Label } from '@almio/design-system';
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
    <Card className="mb-6 shadow-elevation-2">
      <CardContent className="p-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr_1fr]">
        <div className="rounded-xl border border-border bg-muted p-4">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tenant activo
          </p>
          <p className="mt-3 text-body-sm font-medium text-foreground">{tenantId}</p>
          <p className="mt-2 text-body-sm text-muted-foreground">
            {me?.tenant?.schemaName ?? 'Cargando schema tenant...'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted p-4">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Contexto de acceso
          </p>
          <p className="mt-3 text-body-sm font-medium text-foreground">
            {me?.user?.roles.join(', ') || 'Sin roles cargados'}
          </p>
          <p className="mt-2 break-all text-body-sm text-muted-foreground">
            membership: {me?.user?.membershipId ?? 'n/a'}
          </p>
        </div>

        <label className="grid gap-2 rounded-xl border border-border bg-muted p-4">
          <Label>Sucursal activa</Label>
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
          <p className="text-body-sm text-muted-foreground">
            {scopedBranchIds.length > 0
              ? `Scope efectivo: ${scopedBranchIds.length} sucursal(es)`
              : 'Sin restricción por scope en esta sesión'}
          </p>
        </label>
      </div>

      {error ? (
        <Alert variant="danger" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      </CardContent>
    </Card>
  );
}

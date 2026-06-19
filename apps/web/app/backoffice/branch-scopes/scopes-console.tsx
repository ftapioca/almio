'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@almio/design-system';
import { createClient } from '../../../lib/supabase/client';

type BranchScopeBranch = {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
};

type BranchScopeResponse = {
  membershipId: string;
  userAccountId: string;
  role: string;
  branchIds: string[];
  branches: BranchScopeBranch[];
};

function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function normalizeBranchIds(value: string) {
  return value
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function BranchScopesConsole({
  initialApiBaseUrl,
  initialTenantId,
}: {
  initialApiBaseUrl: string;
  initialTenantId: string;
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [accessToken, setAccessToken] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [branchIdsInput, setBranchIdsInput] = useState('');
  const [result, setResult] = useState<BranchScopeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parsedBranchIds = useMemo(
    () => normalizeBranchIds(branchIdsInput),
    [branchIdsInput],
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? '');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? '');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function readScopes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${normalizeApiBaseUrl(apiBaseUrl)}/admin/branch-membership-scopes?membershipId=${encodeURIComponent(membershipId.trim())}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            'X-Tenant-ID': tenantId.trim(),
          },
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'No fue posible consultar los scopes');
      }

      const nextResult = payload.data as BranchScopeResponse;
      setResult(nextResult);
      setBranchIdsInput(nextResult.branchIds.join('\n'));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al consultar scopes',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function replaceScopes() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${normalizeApiBaseUrl(apiBaseUrl)}/admin/branch-membership-scopes/${encodeURIComponent(membershipId.trim())}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId.trim(),
          },
          body: JSON.stringify({
            branchIds: parsedBranchIds,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'No fue posible reemplazar los scopes');
      }

      const nextResult = payload.data as BranchScopeResponse;
      setResult(nextResult);
      setBranchIdsInput(nextResult.branchIds.join('\n'));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al actualizar scopes',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle>Branch Scopes Console</CardTitle>
          <CardDescription>
            Consulta y reemplaza los branch scopes de una membership usando el contrato
            admin actual.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="grid gap-6" onSubmit={readScopes}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <Label htmlFor="branch-scopes-api-base-url">API Base URL</Label>
                <Input
                  id="branch-scopes-api-base-url"
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  placeholder="http://localhost:3001/v1"
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="branch-scopes-tenant-id">Tenant</Label>
                <Input
                  id="branch-scopes-tenant-id"
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  placeholder="almio"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <Label htmlFor="branch-scopes-access-token">Access Token</Label>
              <Textarea
                id="branch-scopes-access-token"
                className="min-h-28"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder="Bearer token emitido por Supabase Auth"
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="grid gap-2">
                <Label htmlFor="branch-scopes-membership-id">Membership ID</Label>
                <Input
                  id="branch-scopes-membership-id"
                  value={membershipId}
                  onChange={(event) => setMembershipId(event.target.value)}
                  placeholder="UUID de company_membership"
                />
              </label>

              <Button
                type="submit"
                size="lg"
                loading={isLoading}
                disabled={
                  isLoading ||
                  !membershipId.trim() ||
                  !tenantId.trim() ||
                  !accessToken.trim()
                }
              >
                {isLoading ? 'Consultando...' : 'Consultar scopes'}
              </Button>
            </div>

            <Card className="border-border/70 bg-muted/20 shadow-none">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Sucursales asignadas</CardTitle>
                  <CardDescription>
                    Una UUID por línea o separadas por coma. El `PUT` reemplaza el scope
                    completo.
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  loading={isLoading}
                  onClick={replaceScopes}
                  disabled={
                    isLoading ||
                    !membershipId.trim() ||
                    !tenantId.trim() ||
                    !accessToken.trim()
                  }
                >
                  {isLoading ? 'Aplicando...' : 'Reemplazar scopes'}
                </Button>
              </CardHeader>

              <CardContent>
                <Textarea
                  className="min-h-44"
                  value={branchIdsInput}
                  onChange={(event) => setBranchIdsInput(event.target.value)}
                  placeholder="11111111-1111-4111-8111-111111111111"
                />
              </CardContent>
            </Card>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle>Resumen actual</CardTitle>
          <CardDescription>
            Resultado del último `GET` o `PUT` sobre `branch_membership_scopes`.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {result ? (
            <div className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="Membership" value={result.membershipId} />
                <StatCard label="User Account" value={result.userAccountId} />
                <StatCard label="Role" value={result.role} />
              </div>

              <div className="grid gap-3">
                {result.branches.length > 0 ? (
                  result.branches.map((branch) => (
                    <Card key={branch.id} className="border-border/70 bg-muted/20 shadow-none">
                      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {branch.code} · {branch.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{branch.id}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{branch.status}</Badge>
                          <Badge variant="outline">{branch.timezone}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta membership no tiene scopes activos asignados.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay datos cargados. Consulta una membership para empezar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70 bg-muted/20 shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-3 break-all text-sm font-medium text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { getPublicApiUrl } from '../../../lib/runtime-env';

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

const defaultApiBaseUrl = getPublicApiUrl();

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
  initialTenantId,
}: {
  initialTenantId: string;
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
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
    <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
      <form className="grid gap-6" onSubmit={readScopes}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              API Base URL
            </span>
            <input
              className="field-input"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="http://localhost:3001/v1"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Tenant
            </span>
            <input
              className="field-input"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="almio"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Access Token
          </span>
          <textarea
            className="field-input min-h-28 resize-y"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder="Bearer token emitido por Supabase Auth"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Membership ID
            </span>
            <input
              className="field-input"
              value={membershipId}
              onChange={(event) => setMembershipId(event.target.value)}
              placeholder="UUID de company_membership"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !membershipId.trim() || !tenantId.trim() || !accessToken.trim()}
          >
            {isLoading ? 'Consultando...' : 'Consultar Scopes'}
          </button>
        </div>

        <div className="rounded-[24px] border border-border/70 bg-panel p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Sucursales asignadas</p>
              <p className="text-sm text-muted">
                Una UUID por linea, o separadas por coma. El `PUT` reemplaza el
                scope completo.
              </p>
            </div>

            <button
              type="button"
              onClick={replaceScopes}
              className="inline-flex h-11 items-center justify-center rounded-full border border-brand/30 bg-brand/8 px-5 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-brand/12 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                isLoading ||
                !membershipId.trim() ||
                !tenantId.trim() ||
                !accessToken.trim()
              }
            >
              {isLoading ? 'Aplicando...' : 'Reemplazar Scopes'}
            </button>
          </div>

          <textarea
            className="field-input mt-4 min-h-44 resize-y"
            value={branchIdsInput}
            onChange={(event) => setBranchIdsInput(event.target.value)}
            placeholder="11111111-1111-4111-8111-111111111111"
          />
        </div>
      </form>

      <div className="mt-6 grid gap-4">
        {error ? (
          <div className="rounded-[20px] border border-danger/30 bg-danger/8 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="rounded-[24px] border border-border/70 bg-surface p-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Resumen actual</p>
            <p className="text-sm text-muted">
              Resultado del ultimo `GET` o `PUT` sobre `branch_membership_scopes`.
            </p>
          </div>

          {result ? (
            <div className="mt-5 grid gap-5">
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="Membership" value={result.membershipId} />
                <StatCard label="User Account" value={result.userAccountId} />
                <StatCard label="Role" value={result.role} />
              </div>

              <div className="grid gap-3">
                {result.branches.length > 0 ? (
                  result.branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="rounded-[20px] border border-border/70 bg-panel p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {branch.code} · {branch.name}
                          </p>
                          <p className="text-sm text-muted">{branch.id}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                          <span className="rounded-full border border-border/70 px-3 py-1">
                            {branch.status}
                          </span>
                          <span className="rounded-full border border-border/70 px-3 py-1">
                            {branch.timezone}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Esta membership no tiene scopes activos asignados.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Aun no hay datos cargados. Consulta una membership para empezar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

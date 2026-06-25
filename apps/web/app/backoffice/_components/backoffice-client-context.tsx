'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { parseApiResponse } from '../_lib/api';
import { BackofficeTenant, BackofficeUser, Branch } from '../_lib/types';
import { useSupabaseAccessToken } from '../_hooks/use-supabase-access-token';

type BackofficeContextValue = {
  accessToken: string;
  apiBaseUrl: string;
  tenantId: string;
  me: {
    user: BackofficeUser | null;
    tenant: BackofficeTenant | null;
  } | null;
  branches: Branch[];
  activeBranchId: string;
  setActiveBranchId: (branchId: string) => void;
  isLoading: boolean;
  error: string | null;
};

const BackofficeContext = createContext<BackofficeContextValue | null>(null);

function getStorageKey(tenantId: string) {
  return `almio.backoffice.activeBranchId.${tenantId}`;
}

export function BackofficeClientContextProvider({
  apiBaseUrl,
  initialTenantId,
  children,
}: {
  apiBaseUrl: string;
  initialTenantId: string;
  children: ReactNode;
}) {
  const accessToken = useSupabaseAccessToken();
  const [me, setMe] = useState<BackofficeContextValue['me']>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedBranchId =
      window.localStorage.getItem(getStorageKey(initialTenantId)) ?? '';
    setActiveBranchIdState(storedBranchId);
  }, [initialTenantId]);

  useEffect(() => {
    if (!accessToken.trim()) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadContext() {
      setIsLoading(true);
      setError(null);

      try {
        const headers = {
          Authorization: `Bearer ${accessToken.trim()}`,
          'X-Tenant-ID': initialTenantId,
        };

        const [meResponse, branchesResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/me`, { headers }),
          fetch(`${apiBaseUrl}/branches?limit=100`, { headers }),
        ]);

        const [mePayload, branchesPayload] = await Promise.all([
          parseApiResponse<BackofficeContextValue['me']>(
            meResponse,
            'No fue posible cargar el contexto del backoffice',
          ),
          parseApiResponse<Branch[]>(
            branchesResponse,
            'No fue posible cargar sucursales del backoffice',
          ),
        ]);

        if (!isMounted) {
          return;
        }

        const nextMe = mePayload;
        const nextBranches = branchesPayload;
        setMe(nextMe);
        setBranches(nextBranches);

        const scopedBranchIds = nextMe?.user?.branchScopeIds ?? [];
        const availableBranchIds =
          scopedBranchIds.length > 0
            ? nextBranches
                .filter((branch) => scopedBranchIds.includes(branch.id))
                .map((branch) => branch.id)
            : nextBranches.map((branch) => branch.id);

        const storedBranchId =
          window.localStorage.getItem(getStorageKey(initialTenantId)) ?? '';
        const nextActiveBranchId = availableBranchIds.includes(storedBranchId)
          ? storedBranchId
          : availableBranchIds[0] ?? '';

        setActiveBranchIdState(nextActiveBranchId);
        if (nextActiveBranchId) {
          window.localStorage.setItem(
            getStorageKey(initialTenantId),
            nextActiveBranchId,
          );
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar el contexto del backoffice',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadContext();

    return () => {
      isMounted = false;
    };
  }, [accessToken, apiBaseUrl, initialTenantId]);

  const setActiveBranchId = useCallback((branchId: string) => {
    setActiveBranchIdState(branchId);
    window.localStorage.setItem(getStorageKey(initialTenantId), branchId);
  }, [initialTenantId]);

  const value = useMemo<BackofficeContextValue>(
    () => ({
      accessToken,
      apiBaseUrl,
      tenantId: initialTenantId,
      me,
      branches,
      activeBranchId,
      setActiveBranchId,
      isLoading,
      error,
    }),
    [
      accessToken,
      apiBaseUrl,
      initialTenantId,
      me,
      branches,
      activeBranchId,
      setActiveBranchId,
      isLoading,
      error,
    ],
  );

  return <BackofficeContext.Provider value={value}>{children}</BackofficeContext.Provider>;
}

export function useBackofficeContext() {
  const context = useContext(BackofficeContext);
  if (!context) {
    throw new Error('useBackofficeContext must be used within BackofficeClientContextProvider');
  }

  return context;
}

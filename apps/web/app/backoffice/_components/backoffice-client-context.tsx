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
import { createClient } from '../../../lib/supabase/client';

type BackofficeUser = {
  id: string;
  supabaseUserId: string;
  email: string | null;
  roles: string[];
  tenantId: string | null;
  membershipId: string | null;
  branchScopeIds: string[];
};

type BackofficeTenant = {
  id: string;
  slug: string;
  schemaName: string;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
};

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

async function parseApiResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        payload?.message ??
        'No fue posible cargar el contexto del backoffice',
    );
  }

  return payload;
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
  const [accessToken, setAccessToken] = useState('');
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
          parseApiResponse(meResponse),
          parseApiResponse(branchesResponse),
        ]);

        if (!isMounted) {
          return;
        }

        const nextMe = mePayload.data as BackofficeContextValue['me'];
        const nextBranches = branchesPayload.data as Branch[];
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

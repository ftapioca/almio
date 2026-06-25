'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBackofficeContext } from '../_components/backoffice-client-context';
import { Employee } from '../_lib/types';
import { useBackofficeApi } from './use-backoffice-api';

type UseBackofficeDirectoryOptions = {
  apiBaseUrl: string;
  tenantId: string;
};

export function useBackofficeDirectory({
  apiBaseUrl,
  tenantId,
}: UseBackofficeDirectoryOptions) {
  const backoffice = useBackofficeContext();
  const api = useBackofficeApi({
    accessToken: backoffice.accessToken,
    apiBaseUrl,
    tenantId,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!api.hasSession || !tenantId.trim()) {
      setEmployees([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextEmployees = await api.request<Employee[]>('/employees?limit=100', {
        fallbackMessage: 'No fue posible cargar colaboradores',
      });
      setEmployees(nextEmployees);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible cargar colaboradores',
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, tenantId]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  return {
    branches: backoffice.branches,
    employees,
    error,
    hasSession: api.hasSession,
    isLoading,
    loadEmployees,
  };
}

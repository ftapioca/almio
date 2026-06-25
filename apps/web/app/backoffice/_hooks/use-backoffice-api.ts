'use client';

import { useMemo } from 'react';
import { requestBackofficeApi } from '../_lib/api';

type UseBackofficeApiOptions = {
  accessToken: string;
  apiBaseUrl: string;
  tenantId: string;
};

export function useBackofficeApi({
  accessToken,
  apiBaseUrl,
  tenantId,
}: UseBackofficeApiOptions) {
  return useMemo(
    () => ({
      accessToken,
      apiBaseUrl,
      hasSession: accessToken.trim().length > 0,
      tenantId,
      request: <T,>(
        path: string,
        options: Omit<
          Parameters<typeof requestBackofficeApi<T>>[0],
          'accessToken' | 'apiBaseUrl' | 'path' | 'tenantId'
        >,
      ) =>
        requestBackofficeApi<T>({
          accessToken,
          apiBaseUrl,
          path,
          tenantId,
          ...options,
        }),
    }),
    [accessToken, apiBaseUrl, tenantId],
  );
}

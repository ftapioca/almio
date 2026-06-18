import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getApiBaseUrl } from '../../../lib/server-env';

export async function getBackofficePageContext(nextPath: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: userResult } = await supabase.auth.getUser();

  return {
    apiBaseUrl: getApiBaseUrl(),
    currentUserEmail: userResult.user?.email ?? 'unknown-user',
    tenantId: 'almio',
  };
}

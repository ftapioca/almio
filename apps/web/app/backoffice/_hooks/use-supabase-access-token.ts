'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export function useSupabaseAccessToken() {
  const [accessToken, setAccessToken] = useState('');

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

  return accessToken;
}

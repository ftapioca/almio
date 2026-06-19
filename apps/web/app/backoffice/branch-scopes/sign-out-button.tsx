'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@almio/design-system';
import { createClient } from '../../../lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <Button type="button" onClick={handleSignOut} variant="outline" className="border-white/16 bg-white/8 text-white hover:bg-white/12 hover:text-white">
      Cerrar Sesion
    </Button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
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
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex h-10 items-center justify-center rounded-full border border-white/16 bg-white/8 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/12"
    >
      Cerrar Sesion
    </button>
  );
}

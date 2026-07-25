"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/**
 * Admin role check. RLS ("Users can view own roles") lets a signed-in user read
 * their own row in `public.user_roles`, so this is safe from the browser.
 * Grant admin by inserting a row `{ user_id, role: 'admin' }` (service role / SQL).
 */
export function useIsAdmin() {
  const { user, ready: authReady } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setIsAdmin(false);
      setReady(true);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsAdmin(Boolean(data));
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  return { isAdmin, ready: ready && authReady, user };
}

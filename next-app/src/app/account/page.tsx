"use client";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function AccountPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/auth?next=/account");
  }, [ready, user, router]);

  if (!ready || !user) return <div className="p-16 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
      <h1 className="text-3xl font-bold">My Account</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <p className="text-xs text-muted-foreground break-all">User ID (JWT sub): {user.id}</p>
      <div className="flex gap-3">
        <Link href="/shop" className="rounded-md border px-4 py-2 text-sm">
          Continue shopping
        </Link>
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm text-brand-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out");
            router.push("/");
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

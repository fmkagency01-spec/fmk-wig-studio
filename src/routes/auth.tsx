import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — FMK WIG" }] }),
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      const target = next && next.startsWith("/") ? next : "/";
      navigate({ to: target });
    }
  }, [user, next, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created! You are signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "signin" ? "Sign in to your FMK WIG account" : "Join FMK WIG to shop and track orders"}
        </p>
      </div>

      <Button onClick={handleGoogle} variant="outline" size="lg" className="w-full">
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8C3.8 20.4 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2C1.3 8.6 1 10.2 1 12s.3 3.4 1 4.9l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.5 2.1 15 1 12 1 7.6 1 3.8 3.6 2 7.1l3.7 2.9C6.6 7.4 9.1 5.4 12 5.4z"/></svg>
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3"><div className="flex-1 border-t" /><span className="text-xs text-muted-foreground">OR</span><div className="flex-1 border-t" /></div>

      <form onSubmit={handleEmail} className="space-y-4">
        {mode === "signup" && (
          <div><Label>Full name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        )}
        <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" disabled={busy} size="lg" className="w-full bg-brand text-brand-foreground hover:opacity-90">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="text-center mt-6 text-sm">
        {mode === "signin" ? (
          <>New here? <button onClick={() => setMode("signup")} className="text-brand font-medium underline">Create account</button></>
        ) : (
          <>Already have an account? <button onClick={() => setMode("signin")} className="text-brand font-medium underline">Sign in</button></>
        )}
      </div>
    </div>
  );
}

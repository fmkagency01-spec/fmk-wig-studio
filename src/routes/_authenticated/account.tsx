import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Package, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", address_line1: "", city: "", postal_code: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        address_line1: data.address_line1 || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
      });
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign out</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Link to="/orders" className="border rounded-lg p-4 hover:border-brand transition-colors flex items-center gap-3">
          <Package className="h-6 w-6 text-brand" />
          <div><div className="font-semibold">My Orders</div><div className="text-xs text-muted-foreground">Track your orders</div></div>
        </Link>
        <div className="border rounded-lg p-4 flex items-center gap-3">
          <User className="h-6 w-6 text-brand" />
          <div><div className="font-semibold">Profile</div><div className="text-xs text-muted-foreground">Manage info</div></div>
        </div>
      </div>

      <form onSubmit={save} className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="font-semibold text-lg">Profile & Shipping</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Postal code</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
        </div>
        <Button disabled={saving} className="bg-brand text-brand-foreground hover:opacity-90">{saving ? "Saving…" : "Save changes"}</Button>
      </form>
    </div>
  );
}

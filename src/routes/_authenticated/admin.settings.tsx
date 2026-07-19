import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [brand, setBrand] = useState({ name: "", tagline: "", hero_title: "", hero_subtitle: "", hero_cta: "", announcement: "" });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCat, setNewCat] = useState({ name: "", slug: "" });

  const load = async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "brand").maybeSingle(),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    if (b?.value) setBrand({ ...brand, ...(b.value as any) });
    setCategories(c || []);
  };
  useEffect(() => { load(); }, []);

  const saveBrand = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "brand", value: brand });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  const addCat = async () => {
    if (!newCat.name) return;
    const slug = newCat.slug || newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("categories").insert({ name: newCat.name, slug, sort_order: categories.length + 1 });
    if (error) return toast.error(error.message);
    setNewCat({ name: "", slug: "" });
    load();
  };

  const delCat = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await supabase.from("categories").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      <div className="border rounded-lg bg-card p-6 space-y-4 mb-6">
        <h2 className="font-semibold text-lg">Brand & Homepage</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Brand name</Label><Input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} /></div>
          <div><Label>Tagline</Label><Input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} /></div>
        </div>
        <div><Label>Announcement bar</Label><Input value={brand.announcement} onChange={(e) => setBrand({ ...brand, announcement: e.target.value })} /></div>
        <div><Label>Hero title</Label><Input value={brand.hero_title} onChange={(e) => setBrand({ ...brand, hero_title: e.target.value })} /></div>
        <div><Label>Hero subtitle</Label><Textarea rows={2} value={brand.hero_subtitle} onChange={(e) => setBrand({ ...brand, hero_subtitle: e.target.value })} /></div>
        <div><Label>Hero CTA text</Label><Input value={brand.hero_cta} onChange={(e) => setBrand({ ...brand, hero_cta: e.target.value })} /></div>
        <Button onClick={saveBrand} disabled={saving} className="bg-brand text-brand-foreground hover:opacity-90">{saving ? "Saving…" : "Save"}</Button>
      </div>

      <div className="border rounded-lg bg-card p-6 space-y-4">
        <h2 className="font-semibold text-lg">Categories</h2>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
              <span>{c.name} <span className="text-muted-foreground">/{c.slug}</span></span>
              <button onClick={() => delCat(c.id)} className="text-destructive text-xs hover:underline">Delete</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Input placeholder="New category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <Input placeholder="slug (optional)" value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} />
          <Button onClick={addCat} className="bg-brand text-brand-foreground hover:opacity-90 shrink-0">Add</Button>
        </div>
      </div>
    </div>
  );
}

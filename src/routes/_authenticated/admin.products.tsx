import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBDT } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  category_id: string | null;
  images: string[];
  featured: boolean;
  active: boolean;
};

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("sort_order"),
    ]);
    setProducts((p as any) || []);
    setCategories(c || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name) return toast.error("Name required");
    const payload = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      description: editing.description ?? null,
      price: Number(editing.price) || 0,
      compare_at_price: editing.compare_at_price ? Number(editing.compare_at_price) : null,
      stock: Number(editing.stock) || 0,
      category_id: editing.category_id || null,
      images: editing.images || [],
      featured: !!editing.featured,
      active: editing.active !== false,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => setEditing({ active: true, images: [], stock: 0, price: 0 })} className="bg-brand text-brand-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />New Product
        </Button>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 flex items-center gap-3">
                  {p.images[0] && <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />}
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </div>
                </td>
                <td className="p-3">{formatBDT(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">
                  {p.active ? <span className="text-green-600 text-xs">Active</span> : <span className="text-muted-foreground text-xs">Hidden</span>}
                  {p.featured && <span className="ml-2 text-xs bg-brand-soft text-brand px-2 py-0.5 rounded">Featured</span>}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(p)} className="p-1.5 hover:text-brand"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => del(p.id)} className="p-1.5 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-background">
              <h2 className="text-xl font-bold">{editing.id ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} /></div>
              <div><Label>Slug</Label><Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={4} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price (৳)</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>Compare price</Label><Input type="number" value={editing.compare_at_price ?? ""} onChange={(e) => setEditing({ ...editing, compare_at_price: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Stock</Label><Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Category</Label>
                <select className="w-full border rounded-md h-9 px-2 bg-background" value={editing.category_id || ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                  <option value="">— None —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Image URLs (one per line)</Label>
                <Textarea rows={3} value={(editing.images || []).join("\n")} onChange={(e) => setEditing({ ...editing, images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} placeholder="/products/my-wig.jpg or https://..." />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={save} className="bg-brand text-brand-foreground hover:opacity-90">Save</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

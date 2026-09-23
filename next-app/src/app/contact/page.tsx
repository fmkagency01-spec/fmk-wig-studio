"use client";

import { FormEvent, useState } from "react";
import { submitB2BInquiry } from "@/lib/analytics";
import { toast } from "sonner";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "general",
    message: "",
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // All contact topics need a saved inquiry, not a best-effort analytics event.
      await submitB2BInquiry({
        company_name: form.name || "Contact form",
        contact_name: form.name,
        email: form.email,
        phone: form.phone,
        business_type: form.subject === "wholesale" ? "inquiry" : "contact",
        notes: `Topic: ${form.subject}\n\n${form.message}`,
        currency: "USD",
        items: [],
      });
      toast.success("Message received — we'll get back to you shortly.");
      setForm({ name: "", email: "", phone: "", subject: "general", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
      <p className="text-xs uppercase tracking-[0.22em] text-brand font-semibold mb-3">Contact</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold mb-3">Talk to FMK WIG</h1>
      <p className="text-muted-foreground mb-10 max-w-xl">
        Retail support, wholesale partnerships, or press — send a note and our team will respond.
        Wholesale inquiries sync into FAOS for follow-up.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 border border-border p-6 md:p-8 bg-card">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm block">
            <span className="font-medium">Name</span>
            <input
              required
              className="mt-1 w-full border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="text-sm block">
            <span className="font-medium">Email</span>
            <input
              required
              type="email"
              className="mt-1 w-full border px-3 py-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
        </div>
        <label className="text-sm block">
          <span className="font-medium">Phone (optional)</span>
          <input
            className="mt-1 w-full border px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label className="text-sm block">
          <span className="font-medium">Topic</span>
          <select
            className="mt-1 w-full border px-3 py-2"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          >
            <option value="general">General support</option>
            <option value="order">Order help</option>
            <option value="wholesale">Wholesale / B2B</option>
            <option value="press">Press / partnership</option>
          </select>
        </label>
        <label className="text-sm block">
          <span className="font-medium">Message</span>
          <textarea
            required
            className="mt-1 w-full min-h-32 border px-3 py-2"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-brand text-brand-foreground font-semibold disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}

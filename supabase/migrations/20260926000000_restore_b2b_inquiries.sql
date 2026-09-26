-- Focused repair for fmk-wig-production. Does not depend on the legacy
-- product/analytics migration having run. Also hardens an existing B2B table.
BEGIN;

CREATE TABLE IF NOT EXISTS public.b2b_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text DEFAULT 'Bangladesh',
  city text,
  business_type text,
  lead_origin text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  notes text,
  estimated_total numeric(12,2),
  currency text NOT NULL DEFAULT 'BDT' CHECK (currency IN ('BDT', 'USD')),
  status text NOT NULL DEFAULT 'new',
  jarvis_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_inquiries
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS b2b_inquiries_user_id_idx ON public.b2b_inquiries(user_id);
CREATE INDEX IF NOT EXISTS b2b_inquiries_created_at_idx ON public.b2b_inquiries(created_at DESC);
ALTER TABLE public.b2b_inquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.b2b_inquiries FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.b2b_inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_inquiries TO authenticated;
GRANT ALL ON public.b2b_inquiries TO service_role;

DROP POLICY IF EXISTS "Anyone can submit B2B inquiry" ON public.b2b_inquiries;
DROP POLICY IF EXISTS "Admins manage B2B inquiries" ON public.b2b_inquiries;
DROP POLICY IF EXISTS "Guests submit unowned inquiries" ON public.b2b_inquiries;
DROP POLICY IF EXISTS "Users submit own inquiries" ON public.b2b_inquiries;
DROP POLICY IF EXISTS "Users read own inquiries" ON public.b2b_inquiries;

-- Anonymous visitors have no verifiable identity: insert only, no read/update.
-- Neither guests nor ordinary users may supply approval or internal sync state.
CREATE POLICY "Guests submit unowned inquiries" ON public.b2b_inquiries
  FOR INSERT TO anon WITH CHECK (
    user_id IS NULL AND status = 'new' AND estimated_total IS NULL AND jarvis_synced_at IS NULL
  );
CREATE POLICY "Users submit own inquiries" ON public.b2b_inquiries
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND status = 'new' AND estimated_total IS NULL AND jarvis_synced_at IS NULL
  );
CREATE POLICY "Users read own inquiries" ON public.b2b_inquiries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage B2B inquiries" ON public.b2b_inquiries
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_b2b_inquiries_updated ON public.b2b_inquiries;
CREATE TRIGGER trg_b2b_inquiries_updated BEFORE UPDATE ON public.b2b_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
NOTIFY pgrst, 'reload schema';
COMMIT;

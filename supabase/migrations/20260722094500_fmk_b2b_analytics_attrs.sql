-- FMK WIG: product attributes, analytics, B2B inquiries, wholesale pricing

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hair_type TEXT,
  ADD COLUMN IF NOT EXISTS cap_size TEXT,
  ADD COLUMN IF NOT EXISTS texture TEXT,
  ADD COLUMN IF NOT EXISTS density TEXT,
  ADD COLUMN IF NOT EXISTS custom_dyeing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS wholesale_moq INT NOT NULL DEFAULT 5;

UPDATE public.products SET
  hair_type = 'human',
  cap_size = 'average',
  texture = 'straight',
  density = '150%',
  custom_dyeing = true,
  wholesale_price = 6800,
  wholesale_moq = 5
WHERE slug = 'silky-straight-human-hair-wig';

UPDATE public.products SET
  hair_type = 'human',
  cap_size = 'average',
  texture = 'body-wave',
  density = '180%',
  custom_dyeing = true,
  wholesale_price = 9900,
  wholesale_moq = 3
WHERE slug = 'body-wave-lace-front-wig';

UPDATE public.products SET
  hair_type = 'synthetic',
  cap_size = 'average',
  texture = 'curly',
  density = '130%',
  custom_dyeing = false,
  wholesale_price = 1800,
  wholesale_moq = 10
WHERE slug = 'curly-bob-synthetic-wig';

UPDATE public.products SET
  hair_type = 'human',
  cap_size = 'n/a',
  texture = 'deep-wave',
  density = 'n/a',
  custom_dyeing = true,
  wholesale_price = 12000,
  wholesale_moq = 5
WHERE slug = 'deep-wave-bundles';

UPDATE public.products SET
  hair_type = 'accessory',
  cap_size = 'one-size',
  texture = 'n/a',
  density = 'n/a',
  custom_dyeing = false,
  wholesale_price = 220,
  wholesale_moq = 20
WHERE slug = 'wig-cap-5pack';

UPDATE public.products SET
  hair_type = 'synthetic',
  cap_size = 'large',
  texture = 'kinky-curly',
  density = '200%',
  custom_dyeing = false,
  wholesale_price = 3200,
  wholesale_moq = 8
WHERE slug = 'kinky-curly-afro-wig';

-- Audience / funnel analytics
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path TEXT,
  referrer TEXT,
  lead_origin TEXT,
  country TEXT,
  city TEXT,
  currency TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_lead_origin_idx ON public.analytics_events (lead_origin);

GRANT SELECT, INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read analytics" ON public.analytics_events;
CREATE POLICY "Admins read analytics"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- B2B bulk inquiries + quote requests
CREATE TABLE IF NOT EXISTS public.b2b_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT DEFAULT 'Bangladesh',
  city TEXT,
  business_type TEXT,
  lead_origin TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  estimated_total NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'new',
  jarvis_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.b2b_inquiries TO anon, authenticated;
GRANT UPDATE ON public.b2b_inquiries TO authenticated;
GRANT ALL ON public.b2b_inquiries TO service_role;
ALTER TABLE public.b2b_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit B2B inquiry" ON public.b2b_inquiries;
CREATE POLICY "Anyone can submit B2B inquiry"
  ON public.b2b_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage B2B inquiries" ON public.b2b_inquiries;
CREATE POLICY "Admins manage B2B inquiries"
  ON public.b2b_inquiries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_b2b_inquiries_updated
  BEFORE UPDATE ON public.b2b_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

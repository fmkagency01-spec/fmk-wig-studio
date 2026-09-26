BEGIN;

ALTER TABLE public.b2b_inquiries
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.b2b_inquiries DROP CONSTRAINT IF EXISTS b2b_inquiries_status_check;
ALTER TABLE public.b2b_inquiries ADD CONSTRAINT b2b_inquiries_status_check
  CHECK (status IN ('new', 'reviewing', 'approved', 'rejected'));

CREATE OR REPLACE FUNCTION public.transition_b2b_inquiry(
  _inquiry_id uuid,
  _next_status text,
  _quote_total numeric DEFAULT NULL,
  _quote_currency text DEFAULT NULL,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_status text;
  changed public.b2b_inquiries%ROWTYPE;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin role required';
  END IF;
  IF _next_status NOT IN ('reviewing', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported inquiry status: %', _next_status;
  END IF;

  SELECT status INTO current_status FROM public.b2b_inquiries
    WHERE id = _inquiry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inquiry not found'; END IF;

  IF NOT (
    (current_status = 'new' AND _next_status IN ('reviewing', 'approved', 'rejected')) OR
    (current_status = 'reviewing' AND _next_status IN ('approved', 'rejected')) OR
    (current_status IN ('approved', 'rejected') AND _next_status = 'reviewing')
  ) THEN
    RAISE EXCEPTION 'Invalid inquiry transition: % -> %', current_status, _next_status;
  END IF;
  IF _next_status = 'approved' AND (_quote_total IS NULL OR _quote_total <= 0) THEN
    RAISE EXCEPTION 'Approved inquiries require a positive final quote';
  END IF;
  IF _next_status = 'rejected' AND nullif(trim(_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Rejected inquiries require a reason';
  END IF;
  IF _quote_currency IS NOT NULL AND _quote_currency NOT IN ('BDT', 'USD') THEN
    RAISE EXCEPTION 'Unsupported quote currency';
  END IF;

  UPDATE public.b2b_inquiries SET
    status = _next_status,
    estimated_total = CASE WHEN _next_status = 'approved' THEN _quote_total ELSE NULL END,
    currency = CASE WHEN _next_status = 'approved' THEN coalesce(_quote_currency, currency) ELSE currency END,
    decision_reason = CASE WHEN _next_status = 'rejected' THEN trim(_reason) ELSE NULL END,
    reviewed_by = CASE WHEN _next_status IN ('approved', 'rejected') THEN auth.uid() ELSE NULL END,
    reviewed_at = CASE WHEN _next_status IN ('approved', 'rejected') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = _inquiry_id
  RETURNING * INTO changed;

  RETURN jsonb_build_object(
    'id', changed.id, 'status', changed.status,
    'estimated_total', changed.estimated_total, 'currency', changed.currency,
    'decision_reason', changed.decision_reason,
    'reviewed_by', changed.reviewed_by, 'reviewed_at', changed.reviewed_at,
    'updated_at', changed.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_b2b_inquiry(uuid, text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_b2b_inquiry(uuid, text, numeric, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

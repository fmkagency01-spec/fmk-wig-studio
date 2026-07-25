-- Fix: restore anonymous (logged-out) storefront reads.
--
-- The private-schema auth refactor (20260722105514) moved has_role() into schema
-- `private` and REVOKED anon's USAGE on that schema + EXECUTE on the function.
-- But the RLS policies on products / categories / site_settings still call
-- private.has_role(auth.uid(), 'admin'), so every logged-out read failed with:
--   "permission denied for function has_role"
-- which took the whole public storefront down (home, shop, product pages 500).
--
-- For an anonymous request auth.uid() is NULL, so has_role() returns FALSE — i.e.
-- anon regains exactly the read access it had before the refactor (active products
-- only), with no elevation. The function stays SECURITY DEFINER and is not exposed
-- via PostgREST (private schema), so this does not widen the API surface.

GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon;

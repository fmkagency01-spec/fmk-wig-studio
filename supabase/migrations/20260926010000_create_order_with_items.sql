-- Persist an order header and all line items in one PostgreSQL transaction.
-- The API uses the service role; browser roles cannot execute this function.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  order_row jsonb,
  item_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  requested_item_count integer;
  inserted_item_count integer;
  new_order_id uuid;
BEGIN
  IF jsonb_typeof(order_row) <> 'object' THEN
    RAISE EXCEPTION 'order_row must be a JSON object';
  END IF;
  IF jsonb_typeof(item_rows) <> 'array' OR jsonb_array_length(item_rows) = 0 THEN
    RAISE EXCEPTION 'item_rows must be a non-empty JSON array';
  END IF;

  new_order_id := (order_row ->> 'id')::uuid;
  requested_item_count := jsonb_array_length(item_rows);

  INSERT INTO public.orders (
    id, user_id, status, payment_status, total, currency,
    customer_name, customer_email, customer_phone, shipping_address
  ) VALUES (
    new_order_id,
    nullif(order_row ->> 'user_id', '')::uuid,
    order_row ->> 'status',
    order_row ->> 'payment_status',
    (order_row ->> 'total')::numeric,
    order_row ->> 'currency',
    order_row ->> 'customer_name',
    order_row ->> 'customer_email',
    order_row ->> 'customer_phone',
    coalesce(order_row -> 'shipping_address', '{}'::jsonb)
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, unit_price, quantity, image_url
  )
  SELECT
    new_order_id, item.product_id, item.product_name,
    item.unit_price, item.quantity, item.image_url
  FROM jsonb_to_recordset(item_rows) AS item(
    product_id uuid,
    product_name text,
    unit_price numeric,
    quantity integer,
    image_url text
  );
  GET DIAGNOSTICS inserted_item_count = ROW_COUNT;

  IF inserted_item_count <> requested_item_count THEN
    RAISE EXCEPTION 'Expected % order items, inserted %', requested_item_count, inserted_item_count;
  END IF;

  RETURN jsonb_build_object(
    'order_id', new_order_id,
    'item_count', inserted_item_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(jsonb, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

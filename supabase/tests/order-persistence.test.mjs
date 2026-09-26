// Run with PGLITE_MODULE pointing to a locally installed @electric-sql/pglite.
// Executes the real migration in isolated PostgreSQL; never targets production.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('order header and items commit atomically in PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE public.products(id uuid PRIMARY KEY);
      CREATE TABLE public.orders(
        id uuid PRIMARY KEY,
        user_id uuid,
        status text NOT NULL,
        payment_status text,
        total numeric(10,2) NOT NULL,
        currency text NOT NULL,
        customer_name text,
        customer_email text,
        customer_phone text,
        shipping_address jsonb
      );
      CREATE TABLE public.order_items(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
        product_name text NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        quantity integer NOT NULL CHECK (quantity > 0),
        image_url text
      );
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON public.orders, public.order_items, public.products TO service_role;
      INSERT INTO public.products(id) VALUES ('11111111-1111-4111-8111-111111111111');
    `);
    const migration = readFileSync(
      new URL('../migrations/20260926010000_create_order_with_items.sql', import.meta.url),
      'utf8',
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec('SET ROLE service_role');

    const goodOrder = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'pending', payment_status: 'unpaid', total: 2500, currency: 'BDT',
      customer_name: 'Test Customer', customer_email: 'test@example.invalid',
      shipping_address: { city: 'Dhaka' },
    };
    const goodItems = [
      { product_id: '11111111-1111-4111-8111-111111111111', product_name: 'Test wig', unit_price: 1000, quantity: 2, image_url: null },
      { product_id: null, product_name: 'Wig cap', unit_price: 500, quantity: 1, image_url: null },
    ];
    const receipt = await db.query(
      'SELECT public.create_order_with_items($1::jsonb, $2::jsonb) AS receipt',
      [JSON.stringify(goodOrder), JSON.stringify(goodItems)],
    );
    assert.deepEqual(receipt.rows[0].receipt, { order_id: goodOrder.id, item_count: 2 });
    assert.equal((await db.query('SELECT * FROM public.orders')).rows.length, 1);
    assert.equal((await db.query('SELECT * FROM public.order_items')).rows.length, 2);

    const badOrder = { ...goodOrder, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    const badItems = [{
      ...goodItems[0],
      product_id: '99999999-9999-4999-8999-999999999999',
    }];
    await assert.rejects(
      db.query(
        'SELECT public.create_order_with_items($1::jsonb, $2::jsonb)',
        [JSON.stringify(badOrder), JSON.stringify(badItems)],
      ),
      /foreign key constraint/,
    );
    await db.exec('ROLLBACK');
    assert.equal(
      (await db.query('SELECT id FROM public.orders WHERE id = $1', [badOrder.id])).rows.length,
      0,
      'a failed item insert must roll back the order header',
    );
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(
      db.query(
        'SELECT public.create_order_with_items($1::jsonb, $2::jsonb)',
        [JSON.stringify(badOrder), JSON.stringify(goodItems)],
      ),
      /permission denied|does not exist/,
    );
  } finally {
    await db.close();
  }
});

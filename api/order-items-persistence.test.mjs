import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.FMK_DATA_DIR = mkdtempSync(join(tmpdir(), 'fmk-order-items-'));
process.env.NODE_ENV = 'production';
process.env.SUPABASE_URL = 'https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-credential';
delete process.env.JARVIS_WEBHOOK_URL;
const { getSupabaseAdmin } = await import('./lib/supabase.ts');
const sb = getSupabaseAdmin();
const { createApiApp } = await import('./index.ts');

test('POST /orders persists its header and line items as one confirmed operation', async (t) => {
  const rpcCalls = [];
  sb.rpc = async (name, args) => {
    rpcCalls.push({ name, args });
    return {
      data: {
        order_id: args.order_row.id,
        item_count: args.item_rows.length,
      },
      error: null,
    };
  };
  // This legacy mock makes the test fail on the old header-only implementation:
  // it can confirm an orders insert, but there is no confirmed item write.
  sb.from = table => ({
    insert(row) {
      assert.equal(table, 'orders');
      return {
        select() {
          return { async single() { return { data: { id: row.id }, error: null }; } };
        },
      };
    },
  });

  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const order = {
    currency: 'BDT',
    subtotal: 2500,
    shipping: 100,
    total: 2600,
    customer_name: 'Order Items Test',
    customer_email: 'order-items@example.invalid',
    items: [
      {
        product_id: '11111111-1111-4111-8111-111111111111',
        slug: 'silky-straight',
        name: 'Silky Straight Wig',
        quantity: 2,
        unit_price: 1000,
      },
      { slug: 'wig-cap', name: 'Wig Cap', quantity: 1, unit_price_bdt: 500 },
    ],
  };

  for (const path of ['/orders', '/ORDERS']) {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    assert.equal(response.status, 201, path);
  }

  assert.equal(rpcCalls.length, 2, 'each order must use the transactional header-plus-items write');
  for (const call of rpcCalls) {
    assert.equal(call.name, 'create_order_with_items');
    assert.equal(call.args.item_rows.length, 2);
    assert.deepEqual(call.args.item_rows[0], {
      product_id: order.items[0].product_id,
      product_name: 'Silky Straight Wig',
      unit_price: 1000,
      quantity: 2,
      image_url: null,
    });
    assert.equal(call.args.item_rows[1].unit_price, 500);
    assert.equal(call.args.item_rows[1].product_id, null);
  }
});

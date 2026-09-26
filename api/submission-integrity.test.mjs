import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.FMK_DATA_DIR = mkdtempSync(join(tmpdir(), 'fmk-submission-test-'));
process.env.NODE_ENV = 'production';
process.env.SUPABASE_URL = 'https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-credential';
delete process.env.JARVIS_WEBHOOK_URL;
const { getSupabaseAdmin } = await import('./lib/supabase.ts');
const sb = getSupabaseAdmin();
const { createApiApp } = await import('./index.ts');

const order = {
  currency: 'BDT', subtotal: 1000, total: 1000,
  customer_name: 'Test Customer', customer_email: 'customer@example.invalid',
  address_line1: 'Test address', city: 'Dhaka',
  items: [{ name: 'Test wig', quantity: 1, unit_price: 1000 }],
};

test('missing credentials and durable order acknowledgements', async (t) => {
  let writes = 0;
  let mode = 'success';
  let saved;
  let release;
  let inserted;
  const insertStarted = new Promise((resolve) => { inserted = resolve; });
  const confirmation = new Promise((resolve) => { release = resolve; });
  sb.rpc = async (name, args) => {
    assert.equal(name, 'create_order_with_items');
    writes++;
    saved = args.order_row;
    if (mode === 'error') return { data: null, error: { message: 'database unavailable' } };
    if (mode === 'throw') throw new Error('network unavailable');
    if (mode === 'empty') return { data: null, error: null };
    if (mode === 'wrong-id') return { data: { order_id: 'not-the-order', item_count: args.item_rows.length }, error: null };
    if (mode === 'wrong-count') return { data: { order_id: args.order_row.id, item_count: 0 }, error: null };
    if (mode === 'delayed') { inserted(); await confirmation; }
    return {
      data: { order_id: args.order_row.id, item_count: args.item_rows.length },
      error: null,
    };
  };
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const postOrder = (path = '/orders') => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order),
  });

  await t.test('all protected routes reject lower, upper, mixed case and trailing slashes', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const routes = [
      ['POST', '/orders'], ['GET', '/orders/test'], ['PATCH', '/orders/test/status'],
      ['POST', '/b2b/inquiries'], ['GET', '/b2b/inquiries'],
      ['GET', '/admin/overview'], ['GET', '/admin/orders'], ['GET', '/admin/analytics/summary'],
      ['POST', '/analytics/events'], ['GET', '/analytics/events'],
      ['POST', '/payments/checkout'], ['POST', '/jarvis/sync-order'], ['POST', '/jarvis/sync-catalog'],
    ];
    for (const [method, path] of routes) {
      const mixed = [...path].map((c, i) => i % 2 ? c.toUpperCase() : c).join('');
      for (const variant of [path, path.toUpperCase(), mixed, path.toUpperCase() + '/']) {
        const response = await fetch(base + variant, { method });
        assert.equal(response.status, 503, method + ' ' + variant);
        assert.deepEqual(await response.json(), {
          ok: false, code: 'blocked_on_service_role',
          error: 'This operation requires server-side database credentials; no data was saved.',
        });
      }
    }
    // Identical valid payloads must also be stopped before any write.
    for (const path of ['/orders', '/ORDERS']) {
      const response = await postOrder(path);
      assert.equal(response.status, 503);
      console.log(path + ' -> ' + response.status + ' ' + JSON.stringify(await response.json()));
    }
    process.env.SUPABASE_SERVICE_ROLE_KEY = '   ';
    assert.equal((await postOrder('/OrDeRs')).status, 503);
    assert.equal(writes, 0);
    assert.deepEqual(readdirSync(process.env.FMK_DATA_DIR), []);
    assert.equal((await fetch(base + '/health')).status, 200);
    assert.equal((await fetch(base + '/catalog/wholesale')).status, 200);
    assert.equal((await fetch(base + '/orders-extra')).status, 404);
  });

  await t.test('database errors and incomplete receipts never return success', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-credential';
    for (mode of ['error', 'throw', 'empty', 'wrong-id', 'wrong-count']) {
      const response = await postOrder();
      assert.equal(response.status, 503, mode);
      const body = await response.json();
      assert.equal(body.ok, false);
      assert.equal(body.order_id, undefined);
      assert.match(body.error, /could not be confirmed/);
      assert.deepEqual(readdirSync(process.env.FMK_DATA_DIR), []);
    }
  });

  await t.test('201 waits for the database receipt and returns its matching ID', async () => {
    mode = 'delayed';
    let responded = false;
    const pending = postOrder().then((response) => { responded = true; return response; });
    await insertStarted;
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(responded, false);
    assert.deepEqual(readdirSync(process.env.FMK_DATA_DIR), []);
    release();
    const response = await pending;
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.order_id, saved.id);
    assert.equal(saved.shipping_address.address_line1, order.address_line1);
    assert.ok(readdirSync(process.env.FMK_DATA_DIR).includes('orders.json'));
  });
});

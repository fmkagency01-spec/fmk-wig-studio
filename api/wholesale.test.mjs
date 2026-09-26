import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.FMK_DATA_DIR = mkdtempSync(join(tmpdir(), 'fmk-wholesale-test-'));
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-credential';
delete process.env.JARVIS_WEBHOOK_URL;
delete process.env.ADMIN_API_KEY;
const { getSupabaseAdmin } = await import('./lib/supabase.ts');
const sb = getSupabaseAdmin();
const { createApiApp } = await import('./index.ts');
const { pushToJarvis } = await import('./lib/jarvis.ts');

test('wholesale API integrity and access boundaries', async (t) => {
  let role = 'customer';
  let writeError = null;
  let saved;
  sb.auth.getUser = async () => ({ data: { user: { id: 'test-user' } }, error: null });
  sb.from = (table) => {
    const query = {
      select() { return this; }, eq() { return this; }, order() { return this; },
      limit: async () => ({ data: saved ? [saved] : [], error: null }),
      maybeSingle: async () => ({ data: { role }, error: null }),
      insert(row) { saved = row; return this; },
      single: async () => ({ data: writeError ? null : { id: saved.id }, error: writeError }),
    };
    assert.ok(['user_roles', 'b2b_inquiries'].includes(table));
    return query;
  };
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const item = { slug: 'silky-straight-human-hair-wig', quantity: 5, wholesale_price_bdt: 1 };

  await t.test('client price cannot override server price', async () => {
    const response = await post('/quotes/instant', { items: [item] });
    assert.equal(response.status, 200);
    const quote = await response.json();
    assert.equal(quote.total_bdt, 32980);
    assert.equal(quote.approval_required, true);
    assert.equal(quote.status, 'indicative_estimate');
  });
  await t.test('unknown products and below-MOQ quantities fail', async () => {
    for (const invalid of [{ ...item, slug: 'unknown' }, { ...item, quantity: 1 }]) {
      assert.equal((await post('/quotes/instant', { items: [invalid] })).status, 400);
    }
  });
  await t.test('ordinary customer cannot read inquiries or analytics', async () => {
    for (const path of ['/b2b/inquiries', '/analytics/events']) {
      assert.equal((await fetch(base + path, { headers: { Authorization: 'Bearer test' } })).status, 403);
    }
  });
  const inquiry = { company_name: 'Test Company', contact_name: 'Test Person', email: 'person@example.invalid', estimated_total: 1, items: [item] };
  await t.test('saved inquiry survives missing notification; client totals stripped', async () => {
    const response = await post('/b2b/inquiries', inquiry);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.inquiry_id, saved.id);
    assert.equal(saved.estimated_total, undefined);
    assert.deepEqual(saved.items, [{ slug: item.slug, quantity: 5 }]);
    assert.equal(result.jarvis.ok, false);
    assert.equal(result.jarvis.skipped, true);
    role = 'admin';
    assert.equal((await fetch(base + '/b2b/inquiries', { headers: { Authorization: 'Bearer test' } })).status, 200);
  });
  await t.test('database failure never acknowledges success', async () => {
    writeError = { message: 'test failure' };
    assert.equal((await post('/b2b/inquiries', inquiry)).status, 503);
    writeError = null;
  });
  await t.test('production requires server-side durable database credentials', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal((await post('/b2b/inquiries', inquiry)).status, 503);
    for (const [method, path] of [
      ['POST', '/orders'], ['GET', '/orders/test'], ['PATCH', '/orders/test/status'],
      ['GET', '/b2b/inquiries'], ['GET', '/admin/overview'], ['GET', '/admin/orders'],
      ['GET', '/admin/analytics/summary'], ['POST', '/analytics/events'],
      ['GET', '/analytics/events'], ['POST', '/payments/checkout'],
      ['POST', '/jarvis/sync-order'], ['POST', '/jarvis/sync-catalog'],
    ]) {
      const blocked = await fetch(base + path, { method });
      assert.equal(blocked.status, 503, `${method} ${path}`);
      assert.equal((await blocked.json()).code, 'blocked_on_service_role');
    }
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).mode, 'public_catalog_only');
    process.env.NODE_ENV = 'test';
  });
});

test('Jarvis requires an application acknowledgement and handles network failures', async () => {
  const originalFetch = globalThis.fetch;
  process.env.JARVIS_WEBHOOK_URL = 'https://unit-test.invalid/webhook';
  try {
    for (const body of [{ ok: false }, {}, { ok: true }]) {
      globalThis.fetch = async () => Response.json(body);
      assert.equal((await pushToJarvis({ type: 'quote', source: 'fmk-wig', occurred_at: '', data: {} })).ok, body.ok === true);
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal((await pushToJarvis({ type: 'quote', source: 'fmk-wig', occurred_at: '', data: {} })).ok, false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.JARVIS_WEBHOOK_URL;
  }
});

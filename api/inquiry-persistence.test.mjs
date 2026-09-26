import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.FMK_DATA_DIR = mkdtempSync(join(tmpdir(), 'fmk-inquiry-'));
process.env.NODE_ENV = 'production';
process.env.SUPABASE_URL = 'https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-credential';
delete process.env.JARVIS_WEBHOOK_URL;
const { getSupabaseAdmin } = await import('./lib/supabase.ts');
const sb = getSupabaseAdmin();
const { createApiApp } = await import('./index.ts');

test('inquiry receipts and ownership', async (t) => {
  let mode = 'error', saved, writes = 0;
  const userId = '11111111-1111-4111-8111-111111111111';
  sb.auth.getUser = async token => {
    if (token === 'offline') throw Error('offline');
    return { data: { user: token === 'valid' ? { id: userId } : null }, error: null };
  };
  sb.from = table => {
    assert.equal(table, 'b2b_inquiries');
    return { insert(row) {
      writes++; saved = row;
      return { select(cols) {
        assert.equal(cols, 'id');
        return { async single() {
          if (mode === 'throw') throw Error('offline');
          if (mode === 'error') return { error: { code: '42P01' }, data: null };
          return { error: null, data: mode === 'empty' ? null : { id: mode === 'wrong' ? 'wrong' : row.id } };
        } };
      } };
    } };
  };
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const body = { company_name: 'Test company', contact_name: 'Test user', email: 'test@example.invalid', user_id: 'spoofed', status: 'approved', estimated_total: 1, items: [] };
  const post = auth => fetch(`http://127.0.0.1:${server.address().port}/b2b/inquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) });
  await t.test('missing table, thrown error, absent receipt and wrong receipt fail closed', async () => {
    for (mode of ['error', 'throw', 'empty', 'wrong']) {
      const r = await post(); assert.equal(r.status, 503);
      assert.equal((await r.json()).inquiry_id, undefined);
      assert.deepEqual(readdirSync(process.env.FMK_DATA_DIR), []);
    }
  });
  await t.test('invalid supplied auth cannot silently become an anonymous inquiry', async () => {
    const before = writes;
    for (const auth of ['Bearer invalid', 'Basic invalid']) assert.equal((await post(auth)).status, 401);
    assert.equal((await post('Bearer offline')).status, 503);
    assert.equal(writes, before);
  });
  await t.test('confirmed anonymous inquiry strips privileged client fields', async () => {
    mode = 'success'; const r = await post(); assert.equal(r.status, 201);
    assert.equal((await r.json()).inquiry_id, saved.id);
    assert.equal(saved.user_id, null); assert.equal(saved.status, 'new'); assert.equal(saved.estimated_total, undefined);
  });
  await t.test('verified JWT establishes owner', async () => {
    const r = await post('Bearer valid'); assert.equal(r.status, 201);
    assert.equal(saved.user_id, userId);
  });
});

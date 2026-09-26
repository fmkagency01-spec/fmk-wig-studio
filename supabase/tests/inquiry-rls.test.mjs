// Run with PGLITE_MODULE pointing to a locally installed @electric-sql/pglite.
// Executes the actual migration in isolated PostgreSQL; never targets production.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('inquiry migration and role isolation in PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TYPE public.app_role AS ENUM ('admin','user');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION private.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
        $$ SELECT $1 = '33333333-3333-4333-8333-333333333333'::uuid AND $2 = 'admin' $$;
      CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS
        $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      GRANT USAGE ON SCHEMA private TO authenticated, service_role;
      REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'), ('33333333-3333-4333-8333-333333333333');
    `);
    const migration = readFileSync(new URL('../migrations/20260926000000_restore_b2b_inquiries.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Repeat application must preserve data/policies safely.
    const one='11111111-1111-4111-8111-111111111111', two='22222222-2222-4222-8222-222222222222', admin='33333333-3333-4333-8333-333333333333';
    const asRole=async(role,uid='')=>{ await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)",[uid]); await db.exec(`SET ROLE ${role}`); };
    const insert="INSERT INTO public.b2b_inquiries(company_name,contact_name,email) VALUES ('Test company','Test person','test@example.invalid')";
    await asRole('anon');
    await db.exec(insert);
    await assert.rejects(db.exec('SELECT * FROM public.b2b_inquiries'), /permission denied/);
    await assert.rejects(db.exec(`INSERT INTO public.b2b_inquiries(company_name,contact_name,email,user_id) VALUES ('Test','Test','test@example.invalid','${one}')`), /row-level security/);
    await assert.rejects(db.exec("INSERT INTO public.b2b_inquiries(company_name,contact_name,email,status) VALUES ('Test','Test','test@example.invalid','approved')"), /row-level security/);
    await asRole('authenticated',one);
    await db.exec(insert);
    assert.equal((await db.query('SELECT * FROM public.b2b_inquiries')).rows.length,1);
    await assert.rejects(db.exec(`INSERT INTO public.b2b_inquiries(company_name,contact_name,email,user_id) VALUES ('Test','Test','test@example.invalid','${two}')`), /row-level security/);
    await assert.rejects(db.exec("INSERT INTO public.b2b_inquiries(company_name,contact_name,email,estimated_total) VALUES ('Test','Test','test@example.invalid',1)"), /row-level security/);
    assert.equal((await db.query("UPDATE public.b2b_inquiries SET status='approved' RETURNING id")).rows.length,0);
    assert.equal((await db.query('DELETE FROM public.b2b_inquiries RETURNING id')).rows.length,0);
    await asRole('authenticated',two);
    assert.equal((await db.query('SELECT * FROM public.b2b_inquiries')).rows.length,0);
    await asRole('authenticated',admin);
    assert.equal((await db.query('SELECT * FROM public.b2b_inquiries')).rows.length,2);
    assert.equal((await db.query("UPDATE public.b2b_inquiries SET status='approved' RETURNING id")).rows.length,2);
    await asRole('service_role');
    assert.equal((await db.query('SELECT * FROM public.b2b_inquiries')).rows.length,2);
    await asRole('authenticated',admin);
    assert.equal((await db.query('DELETE FROM public.b2b_inquiries RETURNING id')).rows.length,2);
    console.log('PASS: guest insert-only; ownership; cross-user isolation; reserved fields; admin manage; service role; repeat migration');
  } finally { await db.close(); }
});

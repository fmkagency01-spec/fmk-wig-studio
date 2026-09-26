import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");

test("inquiry decisions enforce admin role and legal transitions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TYPE public.app_role AS ENUM ('admin','user');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION private.has_role(uid uuid, wanted public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid AND wanted = 'admin' $$;
      CREATE TABLE public.b2b_inquiries(id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'new', estimated_total numeric, currency text NOT NULL DEFAULT 'BDT', updated_at timestamptz NOT NULL DEFAULT now());
      ALTER TABLE public.b2b_inquiries ENABLE ROW LEVEL SECURITY;
      CREATE POLICY admin_all ON public.b2b_inquiries FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
      GRANT USAGE ON SCHEMA public, auth, private TO authenticated;
      GRANT SELECT, UPDATE ON public.b2b_inquiries TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid(), private.has_role(uuid, public.app_role) TO authenticated;
      INSERT INTO auth.users VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
      INSERT INTO public.b2b_inquiries(id) VALUES ('11111111-1111-4111-8111-111111111111');
    `);
    const migration = readFileSync(
      new URL("../migrations/20260926020000_b2b_inquiry_transitions.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const setUser = async (id) => {
      await db.exec("RESET ROLE");
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec("SET ROLE authenticated");
    };
    const call = (status, total = null, currency = null, reason = null) =>
      db.query("SELECT public.transition_b2b_inquiry($1,$2,$3,$4,$5) receipt", [
        "11111111-1111-4111-8111-111111111111",
        status,
        total,
        currency,
        reason,
      ]);

    await setUser("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    await assert.rejects(call("reviewing"), /Admin role required/);
    await db.exec("ROLLBACK");
    await setUser("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    assert.equal((await call("reviewing")).rows[0].receipt.status, "reviewing");
    await assert.rejects(call("approved"), /positive final quote/);
    await db.exec("ROLLBACK");
    await setUser("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const approved = (await call("approved", 12500, "BDT")).rows[0].receipt;
    assert.equal(approved.status, "approved");
    assert.equal(Number(approved.estimated_total), 12500);
    assert.equal(approved.reviewed_by, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    await assert.rejects(call("rejected", null, null, "no stock"), /Invalid inquiry transition/);
    await db.exec("ROLLBACK");
    await setUser("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    await call("reviewing");
    await assert.rejects(call("rejected"), /require a reason/);
    await db.exec("ROLLBACK");
    await setUser("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const rejected = (await call("rejected", null, null, "MOQ unavailable")).rows[0].receipt;
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.decision_reason, "MOQ unavailable");
  } finally {
    await db.close();
  }
});

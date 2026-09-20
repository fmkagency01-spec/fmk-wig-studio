import type { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin, verifyBearerUser } from "./supabase.ts";

/**
 * Guard for monitoring / control-plane endpoints.
 *
 * Accepts EITHER:
 *  - a shared secret header `x-admin-key: <ADMIN_API_KEY>` (for FAOS server-to-server
 *    monitoring / automation), or
 *  - a verified Supabase user with a server-stored admin role.
 *
 * If `ADMIN_API_KEY` is not configured, the shared-secret path is disabled and only
 * a verified admin is accepted. A customer JWT never grants admin access.
 */
export async function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  try {
    const configured = process.env.ADMIN_API_KEY;
    const provided = req.header("x-admin-key");

    if (configured && provided && timingSafeEqual(provided, configured)) {
      (req as Request & { adminVia: string }).adminVia = "api-key";
      next();
      return;
    }

    const user = await verifyBearerUser(req.header("authorization"));
    if (user) {
      const sb = getSupabaseAdmin();
      const role = sb && await sb.from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role || role.error || role.data?.role !== "admin") {
        res.status(403).json({ error: "Admin role required" });
        return;
      }
      (req as Request & { adminVia: string; user: typeof user }).adminVia = "jwt";
      (req as Request & { user: typeof user }).user = user;
      next();
      return;
    }

    res.status(401).json({ error: "Admin access required (x-admin-key or Bearer JWT)" });
  } catch (err) {
    next(err);
  }
}

/** Length-constant string compare to avoid trivial timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

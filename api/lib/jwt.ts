import type { Request, Response, NextFunction } from "express";
import { verifyBearerUser } from "./supabase.ts";

/**
 * Require a valid Supabase JWT (Authorization: Bearer <access_token>).
 * Attaches `req.user` when successful.
 */
export async function requireJwt(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await verifyBearerUser(req.header("authorization"));
    if (!user) {
      res.status(401).json({ error: "Valid JWT required" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

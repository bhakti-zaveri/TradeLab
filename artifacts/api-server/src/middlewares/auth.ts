import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";

// Middleware to mock a logged-in user context
// For a production app, we would use JWT or sessions here.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // We seeded demo@tradelab.app
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, "demo@tradelab.app")
  });

  if (!user) {
    res.status(401).json({ error: "Unauthorized. Demo user not found." });
    return;
  }

  const account = await db.query.accounts.findFirst({
    where: (accounts, { eq }) => eq(accounts.userId, user.id)
  });

  if (!account) {
    res.status(401).json({ error: "Unauthorized. Demo account not found." });
    return;
  }

  // Attach user/account context to request
  (req as any).user = user;
  (req as any).account = account;
  next();
}

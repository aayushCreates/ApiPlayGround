import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";

declare global {
  namespace Express {
    interface Request {
      clerkId?: string;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.clerkId = verified.sub;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return next();
  }

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.clerkId = verified.sub;
  } catch (error) {
    // Optional auth, we just ignore invalid tokens
  }
  next();
};

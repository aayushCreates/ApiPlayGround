import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

export const rateLimitMiddleware = (limit: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Determine an identifier for the user (clerkId if authenticated, or ip)
    const identifier = req.clerkId || req.ip || "unknown-ip";

    // Use route path if available, or just standard path
    const routeInfo = req.baseUrl + (req.route?.path || req.path);
    const key = `ratelimit:${routeInfo}:${identifier}`;

    try {
      const requests = await redis.incr(key);
      if (requests === 1) {
        // Set expiry on the first request in the window
        await redis.expire(key, windowSeconds);
      }
      
      if (requests > limit) {
        return res
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
      }
      next();
    } catch (error) {
      console.error("Rate limit check failed (continuing anyway):", error);
      next();
    }
  };
};

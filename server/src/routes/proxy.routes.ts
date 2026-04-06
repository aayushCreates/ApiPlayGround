import { Router } from "express";
import { proxyRequest } from "../controllers/proxy.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { rateLimitMiddleware } from "../middlewares/rateLimit.middleware";

export const proxyRouter = Router();

// Rate limit: 60/min per user
proxyRouter.post("/", requireAuth, rateLimitMiddleware(60, 60), proxyRequest);

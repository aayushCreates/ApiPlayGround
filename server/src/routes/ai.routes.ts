import { Router } from "express";
import { explainEndpoint, debugError } from "../controllers/ai.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const aiRouter = Router();

aiRouter.post("/explain", requireAuth, explainEndpoint);
aiRouter.post("/debug", requireAuth, debugError);

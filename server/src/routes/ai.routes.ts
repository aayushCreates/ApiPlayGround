import { Router } from "express";
import { explainEndpoint } from "../controllers/ai.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const aiRouter = Router();

aiRouter.post("/explain", requireAuth, explainEndpoint);

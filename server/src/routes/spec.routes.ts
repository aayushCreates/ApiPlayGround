import { Router } from "express";
import {
  createSpec,
  getSpecs,
  getSpecById,
  updateSpec,
  deleteSpec,
  getSpecByShareToken,
  createManualSpec,
} from "../controllers/spec.controller";
import { requireAuth, optionalAuth } from "../middlewares/auth.middleware";

export const specRouter = Router();

specRouter.post("/", requireAuth, createSpec);
specRouter.post("/manual", requireAuth, createManualSpec);
specRouter.get("/", requireAuth, getSpecs);
specRouter.get("/share/:token", getSpecByShareToken);
specRouter.get("/:id", optionalAuth, getSpecById);
specRouter.patch("/:id", requireAuth, updateSpec);
specRouter.delete("/:id", requireAuth, deleteSpec);

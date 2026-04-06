import { Router } from "express";
import {
  createCollection,
  getCollections,
  createSavedRequest,
  deleteSavedRequest,
} from "../controllers/collection.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const collectionRouter = Router();

collectionRouter.post("/", requireAuth, createCollection);
collectionRouter.get("/", requireAuth, getCollections);
collectionRouter.post("/:id/requests", requireAuth, createSavedRequest);
collectionRouter.delete("/:collectionId/requests/:requestId", requireAuth, deleteSavedRequest);

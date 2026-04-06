import { Router } from "express";
import {
  createHistory,
  getHistory,
  getHistoryById,
  clearHistory,
} from "../controllers/history.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const historyRouter = Router();

historyRouter.post("/", requireAuth, createHistory);
historyRouter.get("/", requireAuth, getHistory);
historyRouter.get("/:id", requireAuth, getHistoryById);
historyRouter.delete("/", requireAuth, clearHistory);

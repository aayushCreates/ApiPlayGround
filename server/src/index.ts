import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { errorHandler } from "./middlewares/error.middleware";
import { proxyRouter } from "./routes/proxy.routes";
import { specRouter } from "./routes/spec.routes";
import { historyRouter } from "./routes/history.routes";
import { collectionRouter } from "./routes/collection.routes";
import { aiRouter } from "./routes/ai.routes";
import { verifyDbConnection } from "./config/verifyDb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Config
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/proxy", proxyRouter);
app.use("/api/specs", specRouter);
app.use("/api/history", historyRouter);
app.use("/api/collections", collectionRouter);
app.use("/api/ai", aiRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Global Error Handler
app.use(errorHandler);

verifyDbConnection().then(() => {
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port} 🚀🚀🚀`);
  });
});

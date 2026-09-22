import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { addressesRouter } from "./routes/addresses";
import { deliveriesRouter } from "./routes/deliveries";
import { courierRouter } from "./routes/courier";
import { routesRouter } from "./routes/routes";
import { statsRouter } from "./routes/stats";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "10mb" })); // proof-of-delivery photos are base64 in the body

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/deliveries", deliveriesRouter);
  app.use("/api/courier", courierRouter);
  app.use("/api/routes", routesRouter);
  app.use("/api/stats", statsRouter);

  app.use(errorHandler);

  return app;
}

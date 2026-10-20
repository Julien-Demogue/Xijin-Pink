import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { receiveWebhook } from "./controllers/donations.js";
import { donationsRouter } from "./routes/donations.js";
import { openApiSpec } from "./openapi.js";
import { asyncHandler, log } from "./utils.js";

export const application = express();

application.use(
  "/api-docs",
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec)
);

application.use(helmet());
application.use(cors({ origin:"*" }));

application.post(
  "/api/donations/webhook",
  express.raw({ type: "*/*" }),
  asyncHandler(receiveWebhook)
);

application.use(express.json({ limit: "16kb" }));

application.get("/health", (request, response) => response.json({ status: "ok" }));
application.get("/openapi.json", (request, response) => response.json(openApiSpec));
application.use("/api/donations", donationsRouter);

application.use((request, response) =>
  response.status(404).json({ error: "Resource not found" })
);

application.use((error, request, response, next) => {
  log("error", "unhandled_exception", { message: error.message });
  response.status(500).json({ error: "Internal error" });
});

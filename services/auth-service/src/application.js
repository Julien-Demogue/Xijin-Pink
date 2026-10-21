import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { config } from "./config.js";
import { createTelemetry } from "./middleware/telemetry.js";
import { authRouter } from "./routes/auth.js";
import { openApiSpec } from "./openapi.js";
import { log } from "./utils.js";

export const application = express();

const telemetry = createTelemetry({ serviceName: config.serviceName, log });

application.use(
  "/api-docs",
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec)
);

application.use(helmet());
application.use(cors());
application.use(telemetry.middleware);
application.get("/metrics", telemetry.metricsHandler);
application.use(express.json({ limit: "16kb" }));

application.get("/health", (request, response) => response.json({ status: "ok" }));
application.get("/openapi.json", (request, response) => response.json(openApiSpec));
application.use("/api/auth", authRouter);

application.use((request, response) =>
  response.status(404).json({ error: "Resource not found" })
);

application.use((error, request, response, next) => {
  log("error", "unhandled_exception", { message: error.message });
  response.status(500).json({ error: "Internal error" });
});

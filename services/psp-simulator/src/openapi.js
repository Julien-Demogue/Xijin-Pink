export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "PSP Simulator — Xijin Pink",
    version: "0.1.0",
    description:
      "Simulated payment provider: checkout session, checkout page and signed webhook back to the payment API.",
  },
  servers: [{ url: "http://localhost:3003", description: "Local development" }],
  tags: [{ name: "Payment", description: "Simulated checkout sessions" }],
  components: {
    schemas: {
      SessionRequest: {
        type: "object",
        required: ["reference", "amountCents"],
        properties: {
          reference: { type: "string" },
          amountCents: { type: "integer" },
          currency: { type: "string", example: "EUR" },
          returnUrl: { type: "string" },
        },
      },
      SessionResponse: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          checkoutUrl: { type: "string" },
        },
      },
      ConfirmRequest: {
        type: "object",
        properties: {
          decision: { type: "string", enum: ["pay", "fail"], default: "pay" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Service health",
        responses: { 200: { description: "Service available" } },
      },
    },
    "/sessions": {
      post: {
        tags: ["Payment"],
        summary: "Create a checkout session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SessionRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Session created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionResponse" },
              },
            },
          },
          400: { description: "Invalid parameters" },
        },
      },
    },
    "/checkout/{id}": {
      get: {
        tags: ["Payment"],
        summary: "Checkout page",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "HTML checkout page" },
          404: { description: "Session not found" },
        },
      },
    },
    "/checkout/{id}/confirm": {
      post: {
        tags: ["Payment"],
        summary: "Confirm or fail the payment",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConfirmRequest" },
            },
          },
        },
        responses: {
          200: { description: "Payment processed, webhook sent" },
          404: { description: "Session not found" },
        },
      },
    },
  },
};

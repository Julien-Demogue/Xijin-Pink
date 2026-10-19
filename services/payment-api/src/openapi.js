export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Payment API — Xijin Pink",
    version: "0.1.0",
    description:
      "Donation business API: create a donation, history, leaderboard and titles.",
  },
  servers: [{ url: "http://localhost:3002", description: "Local development" }],
  tags: [{ name: "Donations", description: "Donations and fictional transactions" }],
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      CheckoutRequest: {
        type: "object",
        required: ["amount"],
        properties: {
          amount: {
            type: "integer",
            description: "Amount in cents (between 100 and 1000000)",
            example: 2500,
          },
          currency: { type: "string", example: "EUR" },
          email: {
            type: "string",
            format: "email",
            description: "Required for an anonymous donation (no token)",
          },
        },
      },
      CheckoutResponse: {
        type: "object",
        properties: {
          reference: { type: "string", example: "don_7f3c..." },
          paymentUrl: { type: "string", example: "http://localhost:3003/checkout/sess_..." },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          reference: { type: "string" },
          amountCents: { type: "integer" },
          currency: { type: "string" },
          status: { type: "string", enum: ["pending", "paid", "failed"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      LeaderboardEntry: {
        type: "object",
        properties: {
          rank: { type: "integer" },
          displayName: { type: "string" },
          totalCents: { type: "integer" },
          donationCount: { type: "integer" },
          title: { type: "string", nullable: true },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
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
    "/api/donations/checkout": {
      post: {
        tags: ["Donations"],
        summary: "Start a donation",
        description:
          "Creates a pending transaction and a payment session. Token optional: if provided, the donation is linked to the account.",
        security: [{ bearer: [] }, {}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Session created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckoutResponse" },
              },
            },
          },
          400: {
            description: "Invalid amount or email",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/donations/webhook": {
      post: {
        tags: ["Donations"],
        summary: "Payment provider notification",
        description:
          "Signed call (x-signature-psp header, HMAC SHA-256). Updates the transaction status.",
        responses: {
          200: { description: "Notification accepted" },
          401: { description: "Invalid signature" },
        },
      },
    },
    "/api/donations/history": {
      get: {
        tags: ["Donations"],
        summary: "Account donation history",
        security: [{ bearer: [] }],
        responses: {
          200: {
            description: "Transaction list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transactions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/donations/summary": {
      get: {
        tags: ["Donations"],
        summary: "Total donated, current title and next title",
        security: [{ bearer: [] }],
        responses: {
          200: { description: "Donor summary" },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/donations/leaderboard": {
      get: {
        tags: ["Donations"],
        summary: "Public donor leaderboard",
        responses: {
          200: {
            description: "Leaderboard with titles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    leaderboard: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LeaderboardEntry" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

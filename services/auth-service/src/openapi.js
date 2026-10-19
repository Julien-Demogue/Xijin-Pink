export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Auth Service — Xijin Pink",
    version: "0.1.0",
    description: "User accounts, login and profile.",
  },
  servers: [{ url: "http://localhost:3001", description: "Local development" }],
  tags: [{ name: "Authentication", description: "Accounts and profile" }],
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "displayName"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          displayName: { type: "string", maxLength: 80 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      ProfileRequest: {
        type: "object",
        properties: {
          displayName: { type: "string", maxLength: 80 },
          bio: { type: "string", maxLength: 500 },
        },
      },
      Profile: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string" },
          displayName: { type: "string" },
          bio: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TokenResponse: {
        type: "object",
        properties: { token: { type: "string" } },
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
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Create an account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Account created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenResponse" },
              },
            },
          },
          400: {
            description: "Invalid data",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          409: {
            description: "Email already used",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Log in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenResponse" },
              },
            },
          },
          401: {
            description: "Incorrect credentials",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/profile": {
      get: {
        tags: ["Authentication"],
        summary: "Get own profile",
        security: [{ bearer: [] }],
        responses: {
          200: {
            description: "Profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Profile" },
              },
            },
          },
          401: { description: "Authentication required" },
        },
      },
      put: {
        tags: ["Authentication"],
        summary: "Update own profile",
        security: [{ bearer: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProfileRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Profile" },
              },
            },
          },
          400: { description: "Invalid data" },
          401: { description: "Authentication required" },
        },
      },
    },
  },
};

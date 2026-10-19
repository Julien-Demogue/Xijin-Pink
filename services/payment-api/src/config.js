import "dotenv/config";

function read(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (defaultValue === undefined) {
      throw new Error(`Missing environment variable: ${name}`);
    }
    return defaultValue;
  }
  return value;
}

export const config = {
  serviceName: "payment-api",
  port: Number(read("PORT", "3002")),
  token: {
    secret: read("JWT_SECRET"),
  },
  db: {
    host: read("DB_HOST", "mariadb"),
    port: Number(read("DB_PORT", "3306")),
    user: read("DB_USER", "xijin"),
    password: read("DB_PASSWORD"),
    name: read("DB_NAME", "xijin_pink"),
  },
  psp: {
    url: read("PSP_URL", "http://psp-simulator:3003"),
    webhookSecret: read("PSP_WEBHOOK_SECRET"),
    returnUrl: read("PSP_RETURN_URL", "http://localhost:5173"),
  },
  donation: {
    minAmount: 100,
    maxAmount: 1000000,
    allowedCurrencies: ["EUR"],
  },
};

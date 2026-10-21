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
  serviceName: "psp-simulator",
  port: Number(read("PORT", "3003")),
  paymentApiUrl: read("PAYMENT_API_URL", "http://payment-api:3002"),
  frontendUrl: read("PUBLIC_FRONT_URL", "http://localhost:5173"),
  webhookSecret: read("PSP_WEBHOOK_SECRET"),
  publicUrl: read("PUBLIC_URL", "http://localhost:3003"),
  defaultReturnUrl: read("DEFAULT_RETURN_URL", "http://localhost:5173"),
};

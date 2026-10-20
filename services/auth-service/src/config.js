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
  serviceName: "auth-service",
  port: Number(read("PORT", "3001")),
  frontendUrl: read("PUBLIC_FRONT_URL", "http://localhost:5173"),
  token: {
    secret: read("JWT_SECRET"),
    expiresIn: read("JWT_EXPIRES_IN", "2h"),
  },
  db: {
    host: read("DB_HOST", "mariadb"),
    port: Number(read("DB_PORT", "3306")),
    user: read("DB_USER", "xijin"),
    password: read("DB_PASSWORD"),
    name: read("DB_NAME", "xijin_pink"),
  },
};

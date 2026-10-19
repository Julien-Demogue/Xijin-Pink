import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { pool } from "../db.js";
import { isNonEmptyString, isValidEmail, log } from "../utils.js";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

function signToken(id, email) {
  return jwt.sign({ sub: id, email }, config.token.secret, {
    expiresIn: config.token.expiresIn,
  });
}

export async function register(request, response) {
  const { email, password, displayName } = request.body ?? {};
  if (!isValidEmail(email)) {
    return response.status(400).json({ error: "Invalid email" });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return response
      .status(400)
      .json({ error: "Password too short (8 characters minimum)" });
  }
  if (!isNonEmptyString(displayName, 80)) {
    return response.status(400).json({ error: "Display name is required" });
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const [result] = await pool.execute(
      "INSERT INTO users (email, password_hash, display_name) VALUES (:email, :passwordHash, :displayName)",
      { email: email.toLowerCase(), passwordHash, displayName: displayName.trim() }
    );
    log("info", "account_created", { userId: result.insertId });
    const token = signToken(result.insertId, email.toLowerCase());
    return response.status(201).json({
      token,
      user: {
        id: result.insertId,
        email: email.toLowerCase(),
        displayName: displayName.trim(),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ error: "An account already exists for this email" });
    }
    throw error;
  }
}

export async function login(request, response) {
  const { email, password } = request.body ?? {};
  if (!isValidEmail(email) || typeof password !== "string" || password.length === 0) {
    return response.status(400).json({ error: "Invalid credentials" });
  }
  const [rows] = await pool.execute(
    "SELECT id, email, password_hash FROM users WHERE email = :email",
    { email: email.toLowerCase() }
  );
  const account = rows[0];
  if (!account || !(await bcrypt.compare(password, account.password_hash))) {
    return response.status(401).json({ error: "Incorrect email or password" });
  }
  const token = signToken(account.id, account.email);
  return response.json({ token });
}

export async function getProfile(request, response) {
  const [rows] = await pool.execute(
    "SELECT id, email, display_name AS displayName, bio, created_at AS createdAt FROM users WHERE id = :id",
    { id: request.user.id }
  );
  const profile = rows[0];
  if (!profile) {
    return response.status(404).json({ error: "User not found" });
  }
  return response.json(profile);
}

export async function updateProfile(request, response) {
  const { displayName, bio } = request.body ?? {};
  const fields = [];
  const values = { id: request.user.id };
  if (displayName !== undefined) {
    if (!isNonEmptyString(displayName, 80)) {
      return response.status(400).json({ error: "Invalid display name" });
    }
    fields.push("display_name = :displayName");
    values.displayName = displayName.trim();
  }
  if (bio !== undefined) {
    if (typeof bio !== "string" || bio.length > 500) {
      return response.status(400).json({ error: "Invalid bio" });
    }
    fields.push("bio = :bio");
    values.bio = bio.trim();
  }
  if (fields.length === 0) {
    return response.status(400).json({ error: "No changes provided" });
  }
  await pool.execute(
    `UPDATE users SET ${fields.join(", ")} WHERE id = :id`,
    values
  );
  return getProfile(request, response);
}

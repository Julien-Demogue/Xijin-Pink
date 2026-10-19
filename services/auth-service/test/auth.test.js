import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test_secret";
process.env.DB_PASSWORD = "x";

const { application } = await import("../src/application.js");
const { pool } = await import("../src/db.js");

const httpClient = globalThis.fetch;
let server;
let baseUrl;

before(async () => {
  server = await new Promise((resolve) => {
    const instance = application.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await pool.end().catch(() => {});
});

function postJson(path, body, headers = {}) {
  return httpClient(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("register rejects an invalid email", async () => {
  const response = await postJson("/api/auth/register", {
    email: "invalid",
    password: "Password1",
    displayName: "Alice",
  });
  assert.equal(response.status, 400);
});

test("register creates an account and returns a token", async (t) => {
  t.mock.method(pool, "execute", async () => [{ insertId: 7 }]);
  const response = await postJson("/api/auth/register", {
    email: "alice@example.org",
    password: "Password1",
    displayName: "Alice",
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.token);
  assert.equal(body.user.id, 7);
});

test("register returns 409 on a duplicate email", async (t) => {
  t.mock.method(pool, "execute", async () => {
    const error = new Error("duplicate");
    error.code = "ER_DUP_ENTRY";
    throw error;
  });
  const response = await postJson("/api/auth/register", {
    email: "alice@example.org",
    password: "Password1",
    displayName: "Alice",
  });
  assert.equal(response.status, 409);
});

test("login returns a token for valid credentials", async (t) => {
  const passwordHash = await bcrypt.hash("Password1", 10);
  t.mock.method(pool, "execute", async () => [
    [{ id: 1, email: "alice@example.org", password_hash: passwordHash }],
  ]);
  const response = await postJson("/api/auth/login", {
    email: "alice@example.org",
    password: "Password1",
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.token);
});

test("login rejects a wrong password", async (t) => {
  const passwordHash = await bcrypt.hash("Password1", 10);
  t.mock.method(pool, "execute", async () => [
    [{ id: 1, email: "alice@example.org", password_hash: passwordHash }],
  ]);
  const response = await postJson("/api/auth/login", {
    email: "alice@example.org",
    password: "WrongOne",
  });
  assert.equal(response.status, 401);
});

test("profile without a token returns 401", async () => {
  const response = await httpClient(`${baseUrl}/api/auth/profile`);
  assert.equal(response.status, 401);
});

test("profile with a token returns the account data", async (t) => {
  t.mock.method(pool, "execute", async () => [
    [
      {
        id: 1,
        email: "alice@example.org",
        displayName: "Alice",
        bio: null,
        createdAt: "2026-10-19T00:00:00.000Z",
      },
    ],
  ]);
  const token = jwt.sign({ sub: 1, email: "alice@example.org" }, "test_secret", {
    expiresIn: "1h",
  });
  const response = await httpClient(`${baseUrl}/api/auth/profile`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.displayName, "Alice");
});

import crypto from "node:crypto";
import { config } from "../config.js";
import { pool } from "../db.js";
import { isValidEmail, log } from "../utils.js";
import { computeSignature, isValidSignature } from "../signature.js";
import { loadTitles, resolveNextTitle, resolveTitle } from "../titles.js";

function generateReference() {
  return `don_${crypto.randomUUID()}`;
}

async function createPspSession(reference, amountCents, currency) {
  const response = await fetch(`${config.psp.url}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reference,
      amountCents,
      currency,
      returnUrl: config.psp.returnUrl,
    }),
  });
  if (!response.ok) {
    throw new Error("Unable to create payment session");
  }
  return response.json();
}

export async function createCheckout(request, response) {
  const { amount, currency, email } = request.body ?? {};
  const amountCents = Number(amount);
  if (
    !Number.isInteger(amountCents) ||
    amountCents < config.donation.minAmount ||
    amountCents > config.donation.maxAmount
  ) {
    return response.status(400).json({ error: "Invalid amount" });
  }
  const normalizedCurrency = typeof currency === "string" ? currency.toUpperCase() : "EUR";
  if (!config.donation.allowedCurrencies.includes(normalizedCurrency)) {
    return response.status(400).json({ error: "Unsupported currency" });
  }
  const userId = request.user?.id ?? null;
  const donorEmail = userId ? request.user.email : email;
  if (!userId && !isValidEmail(donorEmail)) {
    return response.status(400).json({ error: "Email required for an anonymous donation" });
  }
  const reference = generateReference();
  await pool.execute(
    "INSERT INTO transactions (user_id, reference, amount_cents, currency, status, donor_email) VALUES (:userId, :reference, :amount, :currency, 'pending', :email)",
    {
      userId,
      reference,
      amount: amountCents,
      currency: normalizedCurrency,
      email: donorEmail ?? null,
    }
  );
  const session = await createPspSession(reference, amountCents, normalizedCurrency);
  log("info", "checkout_created", { reference, amountCents, userId });
  return response.status(201).json({ reference, paymentUrl: session.checkoutUrl });
}

export async function receiveWebhook(request, response) {
  const receivedSignature = request.headers["x-signature-psp"];
  const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from("");
  const expectedSignature = computeSignature(config.psp.webhookSecret, rawBody);
  if (!isValidSignature(receivedSignature, expectedSignature)) {
    log("alert", "webhook_invalid_signature", {});
    return response.status(401).json({ error: "Invalid signature" });
  }
  const event = JSON.parse(rawBody.toString("utf8"));
  const status = event.status === "paid" ? "paid" : "failed";
  await pool.execute(
    "UPDATE transactions SET status = :status, psp_reference = :pspReference WHERE reference = :reference",
    {
      status,
      pspReference: event.pspReference ?? null,
      reference: event.reference,
    }
  );
  log("info", "webhook_received", { reference: event.reference, status });
  return response.json({ received: true });
}

export async function getHistory(request, response) {
  const [rows] = await pool.execute(
    `SELECT reference, amount_cents AS amountCents, currency, status, created_at AS createdAt
     FROM transactions
     WHERE user_id = :id
     ORDER BY created_at DESC
     LIMIT 100`,
    { id: request.user.id }
  );
  return response.json({ transactions: rows });
}

export async function getSummary(request, response) {
  const [rows] = await pool.execute(
    `SELECT COALESCE(SUM(amount_cents), 0) AS totalCents, COUNT(*) AS donationCount
     FROM transactions
     WHERE user_id = :id AND status = 'paid'`,
    { id: request.user.id }
  );
  const totalCents = Number(rows[0].totalCents);
  const titles = await loadTitles();
  return response.json({
    totalCents,
    donationCount: Number(rows[0].donationCount),
    title: resolveTitle(totalCents, titles),
    nextTitle: resolveNextTitle(totalCents, titles),
  });
}

export async function getLeaderboard(request, response) {
  const [rows] = await pool.execute(
    `SELECT u.display_name AS displayName, SUM(t.amount_cents) AS totalCents, COUNT(*) AS donationCount
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.status = 'paid'
     GROUP BY u.id, u.display_name
     ORDER BY totalCents DESC
     LIMIT 50`
  );
  const titles = await loadTitles();
  const leaderboard = rows.map((row, index) => ({
    rank: index + 1,
    displayName: row.displayName,
    totalCents: Number(row.totalCents),
    donationCount: Number(row.donationCount),
    title: resolveTitle(Number(row.totalCents), titles),
  }));
  return response.json({ leaderboard });
}

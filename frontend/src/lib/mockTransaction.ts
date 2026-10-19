import type { Transaction, TransactionStatus } from "@/types/transaction";

function generateTransactionId(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TXN-${random}`;
}

interface CreateFakeTransactionInput {
  donorEmail: string;
  amount: number;
  message?: string;
}

const SIMULATED_DELAY_MS = 900;
const FAILURE_RATE = 0.1;

export function createFakeTransaction(
  input: CreateFakeTransactionInput,
): Promise<Transaction> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date().toISOString();
      const status: TransactionStatus = Math.random() < FAILURE_RATE ? "failed" : "paid";
      resolve({
        id: generateTransactionId(),
        donorEmail: input.donorEmail,
        amount: input.amount,
        currency: "EUR",
        status,
        createdAt: now,
        updatedAt: now,
        message: input.message,
      });
    }, SIMULATED_DELAY_MS);
  });
}

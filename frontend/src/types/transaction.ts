export type TransactionStatus = "pending" | "paid" | "failed";

export interface Transaction {
  reference: string;
  amountCents: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
}

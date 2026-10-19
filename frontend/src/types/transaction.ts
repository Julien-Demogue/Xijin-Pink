export type TransactionStatus = "pending" | "paid" | "failed";

export interface Transaction {
  id: string;
  donorEmail: string;
  amount: number;
  currency: "EUR";
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  message?: string;
}

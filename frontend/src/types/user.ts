import type { Transaction } from "./transaction";

export interface User {
  id: string;
  name: string;
  email: string;
  // Mock-only placeholder, never a real credential store — a real
  // auth-service will replace this entirely.
  password: string;
  bio?: string;
  createdAt: string;
  transactions: Transaction[];
}

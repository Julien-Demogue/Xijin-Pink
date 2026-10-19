import type { User } from "@/types/user";
import type { Transaction } from "@/types/transaction";
import type { LeaderboardEntry } from "@/types/leaderboard";
import type { DonationSummary } from "@/types/summary";

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:3001";
const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API_URL ?? "http://localhost:3002";

const TOKEN_STORAGE_KEY = "xijinpink_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const ERROR_TRANSLATIONS: Record<string, string> = {
  "Invalid email": "Adresse email invalide.",
  "Password too short (8 characters minimum)": "Le mot de passe doit contenir au moins 8 caractères.",
  "Display name is required": "Veuillez indiquer votre nom.",
  "An account already exists for this email": "Un compte existe déjà avec cet email.",
  "Invalid credentials": "Email ou mot de passe incorrect.",
  "Incorrect email or password": "Email ou mot de passe incorrect.",
  "Authentication required": "Veuillez vous connecter.",
  "Invalid or expired token": "Votre session a expiré, veuillez vous reconnecter.",
  "Invalid display name": "Nom invalide.",
  "Invalid bio": "Bio invalide (500 caractères maximum).",
  "No changes provided": "Aucune modification à enregistrer.",
  "Invalid amount": "Veuillez saisir un montant valide.",
  "Unsupported currency": "Devise non prise en charge.",
  "Email required for an anonymous donation": "Veuillez indiquer votre email pour un don sans compte.",
  "User not found": "Compte introuvable.",
  "Resource not found": "Ressource introuvable.",
};

function translateError(message: string | undefined): string {
  if (!message) return "Une erreur est survenue. Réessayez.";
  return ERROR_TRANSLATIONS[message] ?? message;
}

async function request<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Impossible de contacter le serveur. Réessayez plus tard.", 0);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(translateError(body?.error), response.status);
  }
  return body as T;
}

// --- auth-service ---

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterResponse {
  token: string;
  user: { id: number; email: string; displayName: string };
}

export function authRegister(input: RegisterInput): Promise<RegisterResponse> {
  return request(AUTH_API_URL, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function authLogin(input: { email: string; password: string }): Promise<{ token: string }> {
  return request(AUTH_API_URL, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function authGetProfile(): Promise<User> {
  return request(AUTH_API_URL, "/api/auth/profile");
}

export function authUpdateProfile(input: { displayName?: string; bio?: string }): Promise<User> {
  return request(AUTH_API_URL, "/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// --- payment-api ---

export interface CheckoutInput {
  amount: number;
  currency?: string;
  email?: string;
}

export function donationsCheckout(
  input: CheckoutInput,
): Promise<{ reference: string; paymentUrl: string }> {
  return request(PAYMENT_API_URL, "/api/donations/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function donationsHistory(): Promise<Transaction[]> {
  const { transactions } = await request<{ transactions: Transaction[] }>(
    PAYMENT_API_URL,
    "/api/donations/history",
  );
  return transactions;
}

export function donationsSummary(): Promise<DonationSummary> {
  return request(PAYMENT_API_URL, "/api/donations/summary");
}

export async function donationsLeaderboard(): Promise<LeaderboardEntry[]> {
  const { leaderboard } = await request<{ leaderboard: LeaderboardEntry[] }>(
    PAYMENT_API_URL,
    "/api/donations/leaderboard",
  );
  return leaderboard;
}

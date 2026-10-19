import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_USERS } from "@/data/mockUsers";
import type { Transaction } from "@/types/transaction";
import type { User } from "@/types/user";

const USERS_STORAGE_KEY = "xijinpink_users";
const SESSION_STORAGE_KEY = "xijinpink_session";

type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => AuthResult;
  register: (input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => AuthResult;
  logout: () => void;
  updateProfile: (input: { name: string; email: string; bio?: string }) => AuthResult;
  addDonation: (donation: Omit<Transaction, "donorEmail">) => Transaction;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadUsers(): User[] {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(MOCK_USERS));
    return MOCK_USERS;
  }
  try {
    return JSON.parse(raw) as User[];
  } catch {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(MOCK_USERS));
    return MOCK_USERS;
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function generateUserId(): string {
  return `user-${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializers read localStorage synchronously on first render, so
  // route guards never see a transient "logged out" state before hydration.
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return null;
    return loadUsers().some((user) => user.id === sessionId) ? sessionId : null;
  });

  const persistUsers = useCallback((nextUsers: User[]) => {
    setUsers(nextUsers);
    saveUsers(nextUsers);
  }, []);

  const login = useCallback(
    (email: string, password: string): AuthResult => {
      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
      if (!user || user.password !== password) {
        return { ok: false, error: "Email ou mot de passe incorrect." };
      }
      setCurrentUserId(user.id);
      localStorage.setItem(SESSION_STORAGE_KEY, user.id);
      return { ok: true };
    },
    [users],
  );

  const register = useCallback(
    (input: { name: string; email: string; password: string; confirmPassword: string }): AuthResult => {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: "Un compte existe déjà avec cet email." };
      }
      if (input.password !== input.confirmPassword) {
        return { ok: false, error: "Les mots de passe ne correspondent pas." };
      }
      const newUser: User = {
        id: generateUserId(),
        name: input.name.trim(),
        email: normalizedEmail,
        password: input.password,
        createdAt: new Date().toISOString(),
        transactions: [],
      };
      const nextUsers = [...users, newUser];
      persistUsers(nextUsers);
      setCurrentUserId(newUser.id);
      localStorage.setItem(SESSION_STORAGE_KEY, newUser.id);
      return { ok: true };
    },
    [users, persistUsers],
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const updateProfile = useCallback(
    (input: { name: string; email: string; bio?: string }): AuthResult => {
      if (!currentUserId) {
        return { ok: false, error: "Vous devez être connecté." };
      }
      const normalizedEmail = input.email.trim().toLowerCase();
      const emailTaken = users.some(
        (user) => user.id !== currentUserId && user.email.toLowerCase() === normalizedEmail,
      );
      if (emailTaken) {
        return { ok: false, error: "Un compte existe déjà avec cet email." };
      }
      const nextUsers = users.map((user) =>
        user.id === currentUserId
          ? { ...user, name: input.name.trim(), email: normalizedEmail, bio: input.bio }
          : user,
      );
      persistUsers(nextUsers);
      return { ok: true };
    },
    [currentUserId, users, persistUsers],
  );

  const addDonation = useCallback(
    (donation: Omit<Transaction, "donorEmail">): Transaction => {
      const transaction: Transaction = {
        ...donation,
        donorEmail: users.find((user) => user.id === currentUserId)?.email ?? "",
      };
      if (currentUserId) {
        const nextUsers = users.map((user) =>
          user.id === currentUserId
            ? { ...user, transactions: [transaction, ...user.transactions] }
            : user,
        );
        persistUsers(nextUsers);
      }
      return transaction;
    },
    [currentUserId, users, persistUsers],
  );

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: currentUser !== null,
      login,
      register,
      logout,
      updateProfile,
      addDonation,
    }),
    [currentUser, login, register, logout, updateProfile, addDonation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider.");
  }
  return context;
}

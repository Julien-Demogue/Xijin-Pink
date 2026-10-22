import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  authGetProfile,
  authLogin,
  authRegister,
  authUpdateProfile,
  clearToken,
  getToken,
  setToken,
} from "@/lib/apiClient";
import type { User } from "@/types/user";

type AuthResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "Une erreur est survenue. Réessayez.";

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}

interface AuthContextValue {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithToken: (token: string) => Promise<AuthResult>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<AuthResult>;
  logout: () => void;
  updateProfile: (input: { displayName: string; bio?: string }) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => getToken() !== null);

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    authGetProfile()
      .then((user) => setCurrentUser(user))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { token } = await authLogin({ email, password });
      setToken(token);
      const user = await authGetProfile();
      setCurrentUser(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  // Adopt a session from a token obtained elsewhere (e.g. the face-auth flow,
  // which delegates the password check to auth-service and returns the same JWT).
  const loginWithToken = useCallback(async (token: string): Promise<AuthResult> => {
    try {
      setToken(token);
      const user = await authGetProfile();
      setCurrentUser(user);
      return { ok: true };
    } catch (error) {
      clearToken();
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }): Promise<AuthResult> => {
      try {
        const { token } = await authRegister(input);
        setToken(token);
        const user = await authGetProfile();
        setCurrentUser(user);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { displayName: string; bio?: string }): Promise<AuthResult> => {
      try {
        const user = await authUpdateProfile(input);
        setCurrentUser(user);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: currentUser !== null,
      isLoading,
      login,
      loginWithToken,
      register,
      logout,
      updateProfile,
    }),
    [currentUser, isLoading, login, loginWithToken, register, logout, updateProfile],
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

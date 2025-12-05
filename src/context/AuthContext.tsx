import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "@/utils/axios";
import type { User, AuthContextType, LoginCredentials } from "@/types";

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  login: async () => {},
  logout: () => {},
  fetchCurrentUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await api.post("/login", credentials);
      setUser(response.data);
      localStorage.setItem("token", response.data.token);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      const response = await api.get("/current_user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (isMounted) setUser(null);
          return;
        }

        const response = await api.get("/current_user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) setUser(response.data);
      } catch (error) {
        console.error("Error fetching user:", error);
        if (isMounted) setUser(null);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, logout, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

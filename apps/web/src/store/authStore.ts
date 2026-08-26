import { create } from "zustand";
import type { User, UserRole } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("coopgig_token", token);
      localStorage.setItem("coopgig_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("coopgig_token");
      localStorage.removeItem("coopgig_user");
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user) => set({ user }),

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("coopgig_token");
      const userStr = localStorage.getItem("coopgig_user");
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

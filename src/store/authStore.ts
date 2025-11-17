import { create } from "zustand";
import { AuthService } from "../services/auth.service";

interface User {
  id: string;
  email?: string;
  phone?: string;
  role: string; // 👈 added role
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;

  login: (user: User) => void;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  // NEW LOGIN
  login: (user) => set({ user }),

  setUser: (user) => set({ user }),

  signOut: async () => {
    set({ loading: true });
    try {
      await AuthService.signOut();
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  initialize: async () => {
    try {
      const user = await AuthService.getCurrentUser();
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },
}));

// Sync external auth events
AuthService.onAuthStateChange((user) => {
  useAuthStore.setState({ user });
});

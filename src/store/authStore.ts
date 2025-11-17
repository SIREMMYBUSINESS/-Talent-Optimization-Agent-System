import { create } from 'zustand';
import { AuthService } from '../services/auth.service';

interface User {
  id: string;
  email?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),

  signOut: async () => {
    set({ loading: true });
    try {
      await AuthService.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      set({ loading: false });
    }
  },

  initialize: async () => {
    try {
      const user = await AuthService.getCurrentUser();
      set({ user, initialized: true });
    } catch (error) {
      set({ user: null, initialized: true });
    }
  },
}));

AuthService.onAuthStateChange((user) => {
  useAuthStore.setState({ user });
});

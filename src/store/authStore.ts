import { create } from 'zustand';
import { AuthService } from '../services/auth.service';

interface User {
  id: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'recruiter' | 'compliance' | 'viewer';
}

interface AuthState {
  user: User | null;
  userRole: 'admin' | 'recruiter' | 'compliance' | 'viewer';
  loading: boolean;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setUserRole: (role: 'admin' | 'recruiter' | 'compliance' | 'viewer') => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRole: 'viewer',
  loading: false,
  isLoading: false,
  initialized: false,

  setUser: (user) => {
    const role = user?.role || 'viewer';
    set({ user, userRole: role });
  },

  setUserRole: (role) => set({ userRole: role }),

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
    set({ isLoading: true });
    try {
      const user = await AuthService.getCurrentUser();
      const role = user?.role || 'viewer';
      set({ user, userRole: role, initialized: true, isLoading: false });
    } catch (error) {
      set({ user: null, userRole: 'viewer', initialized: true, isLoading: false });
    }
  },
}));

AuthService.onAuthStateChange((user) => {
  const role = user?.role || 'viewer';
  useAuthStore.setState({ user, userRole: role });
});

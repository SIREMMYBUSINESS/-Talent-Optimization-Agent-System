import { supabase } from '../lib/supabase';

export interface SignUpWithEmailParams {
  email: string;
  password: string;
}

export interface SignUpWithPhoneParams {
  phone: string;
  password: string;
}

export interface SignInWithEmailParams {
  email: string;
  password: string;
}

export interface SignInWithPhoneParams {
  phone: string;
  password: string;
}

export class AuthService {
  static async signUpWithEmail({ email, password }: SignUpWithEmailParams) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signUpWithPhone({ phone, password }: SignUpWithPhoneParams) {
    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signInWithEmail({ email, password }: SignInWithEmailParams) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signInWithPhone({ phone, password }: SignInWithPhoneParams) {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  static onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
}

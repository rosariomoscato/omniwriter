export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  role: 'free' | 'premium' | 'lifetime' | 'admin';
  subscription_status?: string;
  subscription_expires_at?: string;
  preferred_language: 'it' | 'en';
  theme_preference: 'light' | 'dark';
  google_id?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  password_hash?: string;
}

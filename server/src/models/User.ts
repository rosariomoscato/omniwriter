export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  preferred_language: 'it' | 'en';
  theme_preference: 'light' | 'dark';
  google_id?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  password_hash?: string;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
}

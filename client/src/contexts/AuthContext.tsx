import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, ApiService } from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  preferred_language?: 'it' | 'en';
  theme_preference?: 'light' | 'dark';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing auth on mount
    const { user: storedUser, token: storedToken } = ApiService.getAuth();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    const response = await apiService.login({ email, password, rememberMe });
    setUser(response.user);
    setToken(response.token);
    ApiService.setAuth(response.user, response.token);
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
    setToken(null);
    ApiService.clearAuth();
    navigate('/login');
  };

  const refreshUser = async () => {
    try {
      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      // Check if it's an auth error (session expired)
      if (error.isAuthError || error.statusCode === 401 || error.statusCode === 403) {
        // Clear auth and redirect to login
        setUser(null);
        setToken(null);
        ApiService.clearAuth();
        sessionStorage.setItem('sessionExpired', 'true');
        navigate('/login');
      } else {
        // Other error, just clear auth
        await logout();
      }
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      if (token) {
        ApiService.setAuth(updatedUser, token);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

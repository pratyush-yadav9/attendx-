import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authService, LoginResult } from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verifyOtp: (userId: string, otpCode: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('attendx_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState<Role | null>(() => {
    return (localStorage.getItem('attendx_role') as Role) || null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('attendx_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('attendx_token');
      if (storedToken) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          setRole(profile.role);
          localStorage.setItem('attendx_user', JSON.stringify(profile));
          localStorage.setItem('attendx_role', profile.role);
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          authService.logout();
          setUser(null);
          setRole(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (res: LoginResult) => {
    if (res.access_token && res.user && res.role) {
      setToken(res.access_token);
      setUser(res.user);
      setRole(res.role);
      localStorage.setItem('attendx_token', res.access_token);
      localStorage.setItem('attendx_user', JSON.stringify(res.user));
      localStorage.setItem('attendx_role', res.role);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const res = await authService.login(username, password);
    if (!res.require_otp) {
      handleAuthSuccess(res);
    }
    return res;
  };

  const verifyOtp = async (userId: string, otpCode: string): Promise<LoginResult> => {
    const res = await authService.verifyOtp(userId, otpCode);
    handleAuthSuccess(res);
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setRole(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
      setRole(profile.role);
      localStorage.setItem('attendx_user', JSON.stringify(profile));
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        verifyOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

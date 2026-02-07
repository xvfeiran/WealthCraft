import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authApi } from '../api/client';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, baseCurrency?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });

  // 从localStorage恢复登录状态
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setState({ user, token, isAuthenticated: true });
      } catch {
        // localStorage数据损坏，清理
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // 验证token有效性
  const validateToken = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');

    if (!token) {
      return false;
    }

    try {
      const response = await authApi.getProfile();

      if (response.data.success && response.data.data) {
        const user = response.data.data;
        localStorage.setItem('user', JSON.stringify(user));
        setState({ user, token, isAuthenticated: true });
        return true;
      } else {
        // Token无效，清理并退出
        handleLogout();
        return false;
      }
    } catch (error: any) {
      // 401或其他错误，清理token
      if (error.response?.status === 401) {
        handleLogout();
      }
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, isAuthenticated: false });
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { user, token } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setState({ user, token, isAuthenticated: true });
  };

  const register = async (email: string, password: string, baseCurrency?: string) => {
    const response = await authApi.register(email, password, baseCurrency);
    const { user, token } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setState({ user, token, isAuthenticated: true });
  };

  const logout = () => {
    handleLogout();
  };

  const updateUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setState((prev) => ({ ...prev, user }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, validateToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

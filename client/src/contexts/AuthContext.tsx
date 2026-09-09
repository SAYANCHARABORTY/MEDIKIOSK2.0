import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserRole } from '@medikiosk/shared';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  facilityId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('medikiosk_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = localStorage.getItem('medikiosk_token');
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Source of truth: verify session with backend /api/auth/me
        const backendUser = await api.auth.getMe();
        if (isMounted) {
          const authUser: AuthUser = {
            id: backendUser.id,
            username: backendUser.username,
            name: backendUser.name,
            role: backendUser.role as UserRole,
            facilityId: backendUser.facility_id || backendUser.facilityId
          };
          setUser(authUser);
          setToken(storedToken);
          localStorage.setItem('medikiosk_user', JSON.stringify(authUser));
        }
      } catch (err) {
        // Stale or invalid token - purge session
        localStorage.removeItem('medikiosk_token');
        localStorage.removeItem('medikiosk_user');
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const res = await api.auth.login(credentials);
    setUser(res.user);
    setToken(res.token);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem('medikiosk_token');
      localStorage.removeItem('medikiosk_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

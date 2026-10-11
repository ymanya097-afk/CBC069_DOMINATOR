import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api.ts';
import { User, Member, Family, MemberStatus } from '../types/index.ts';

interface AuthContextValue {
  user: User | null;
  member: Member | null;
  family: Family | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, familyName: string) => Promise<void>;
  joinFamily: (code: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateStatus: (newStatus: MemberStatus) => Promise<{ reassignedCount: number; flaggedCount: number; pendingCount: number } | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('homesync_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('homesync_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      if (!getStoredToken()) {
        setIsLoading(false);
        return;
      }
      const data = await apiRequest<{ user: User; member: Member; family: Family }>('/api/me');
      setUser(data.user);
      setMember(data.member);
      setFamily(data.family);
    } catch (err) {
      console.error('Failed to load active profile:', err);
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setMember(null);
      setFamily(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: User; member: Member; family: Family }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setMember(data.member);
    setFamily(data.family);
  };

  const register = async (name: string, email: string, password: string, familyName: string) => {
    const data = await apiRequest<{ token: string; user: User; member: Member; family: Family }>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, familyName })
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setMember(data.member);
    setFamily(data.family);
  };

  const joinFamily = async (code: string, name: string, email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: User; member: Member; family: Family }>('/api/join', {
      method: 'POST',
      body: JSON.stringify({ code, name, email, password })
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setMember(data.member);
    setFamily(data.family);
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setMember(null);
    setFamily(null);
  };

  const updateStatus = async (newStatus: MemberStatus) => {
    if (!member) return null;
    const res = await apiRequest<{ member: Member; reassignedTasks: any }>(`/api/members/${member.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    setMember(res.member);
    return res.reassignedTasks;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        family,
        token,
        isAuthenticated: !!user && !!member,
        isLoading,
        darkMode,
        toggleDarkMode,
        login,
        register,
        joinFamily,
        logout,
        updateStatus,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

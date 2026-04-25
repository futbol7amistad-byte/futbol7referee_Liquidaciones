import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (roleOrCredentials: Role | { username: string; password: string }, userData?: User) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (roleOrCredentials: Role | { username: string; password: string }, userData?: User) => {
    // Case 1: Dynamic Referee login from Login.tsx
    if (typeof roleOrCredentials === 'string' && roleOrCredentials === 'referee' && userData) {
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      return true;
    }

    // Case 2: Hardcoded login (Admin/Collab)
    if (typeof roleOrCredentials === 'object' && 'username' in roleOrCredentials) {
      const { username, password } = roleOrCredentials;
      if (username === 'Administrador' && password === 'F7Amistad2026*') {
          const adminUser: User = { id: 'admin1', email: 'admin@futbol7amistad.com', role: 'admin', name: 'Administrador' };
          setUser(adminUser);
          localStorage.setItem('auth_user', JSON.stringify(adminUser));
          return true;
      }
      if (username === 'Colaborador' && password === 'Pedro2026*') {
          const collabUser: User = { id: 'colab1', email: 'colab@futbol7amistad.com', role: 'collaborator', name: 'Colaborador' };
          setUser(collabUser);
          localStorage.setItem('auth_user', JSON.stringify(collabUser));
          return true;
      }
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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

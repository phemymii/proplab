import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatarInitials: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const demoUser: AuthUser = {
  id: 'usr_demo',
  name: 'Ada Lovelace',
  email: 'ada@proplab.dev',
  role: 'owner',
  avatarInitials: 'AL',
};

export interface AuthProviderProps {
  children: ReactNode;
  /** Override the signed-in user (null = signed out) */
  user?: AuthUser | null;
}

export function AuthProvider({
  children,
  user = demoUser,
}: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user != null,
      signOut: () => {
        // Preview stub — real apps would clear session state.
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

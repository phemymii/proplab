import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { themePalettes, type LabThemeMode } from '../theme';

export interface ThemeContextValue {
  mode: LabThemeMode;
  setMode: (mode: LabThemeMode) => void;
  colors: (typeof themePalettes)[LabThemeMode];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: LabThemeMode;
}

export function ThemeProvider({
  children,
  defaultMode = 'light',
}: ThemeProviderProps) {
  const [mode, setMode] = useState<LabThemeMode>(defaultMode);
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      colors: themePalettes[mode],
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

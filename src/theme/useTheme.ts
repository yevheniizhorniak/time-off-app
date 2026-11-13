import { createContext, useContext } from 'react';

import type { Theme } from './theme-preference';

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme requires ThemeProvider.');
  return context;
}

import { useCallback, useLayoutEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';

import { applyTheme, getInitialTheme, saveTheme } from '../theme-preference';
import { ThemeContext } from '../useTheme';

type ThemeProviderProps = {
  /** Content sharing the selected document theme. */
  children: ReactNode;
};

export default function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    saveTheme(nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

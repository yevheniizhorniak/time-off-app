import type { ReactElement } from 'react';

import { useTheme } from '../../theme/useTheme';
import { ToaButton } from '../button/Button';

export function ToaThemeButton(): ReactElement {
  const { theme, toggleTheme } = useTheme();
  return (
    <ToaButton
      emphasis="secondary"
      label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={toggleTheme}
    />
  );
}

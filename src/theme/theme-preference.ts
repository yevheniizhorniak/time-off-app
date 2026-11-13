export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
  try {
    const savedTheme = window.localStorage.getItem('toa-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch {
    // The OS preference still works when storage is unavailable.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.style.colorScheme = theme;
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem('toa-theme', theme);
  } catch {
    // Keep the selected theme usable for the current session.
  }
}

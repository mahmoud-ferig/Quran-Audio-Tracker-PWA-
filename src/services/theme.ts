export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY_THEME = 'quran_app_theme';

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (e) {
    console.error('Error reading theme from storage:', e);
  }
  // Default is LIGHT as requested
  return 'light';
}

export function applyTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme-color meta tag for browser navbar & status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#080c16' : '#f8fafc');
    }
  } catch (e) {
    console.error('Error applying theme:', e);
  }
}

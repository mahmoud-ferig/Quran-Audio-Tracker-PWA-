export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'emerald' | 'gold' | 'indigo' | 'sapphire';

const STORAGE_KEY_THEME = 'quran_app_theme';
const STORAGE_KEY_ACCENT = 'quran_app_accent';

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (e) {
    console.error('Error reading theme from storage:', e);
  }
  // Default is LIGHT
  return 'light';
}

export function getStoredAccent(): AccentColor {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACCENT);
    if (saved === 'emerald' || saved === 'gold' || saved === 'indigo' || saved === 'sapphire') {
      return saved;
    }
  } catch (e) {
    console.error('Error reading accent from storage:', e);
  }
  return 'emerald';
}

export function applyTheme(theme: ThemeMode, accent: AccentColor = 'emerald'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    localStorage.setItem(STORAGE_KEY_ACCENT, accent);
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
    
    // Update theme-color meta tag for browser navbar & status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#080c16' : '#f8fafc');
    }
  } catch (e) {
    console.error('Error applying theme:', e);
  }
}

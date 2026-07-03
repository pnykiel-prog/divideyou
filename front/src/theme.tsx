import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'petrol' | 'midnight';
const KEY = 'divideyou_theme';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}
const Ctx = createContext<ThemeCtx>({ theme: 'petrol', setTheme: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme) || 'petrol');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
}

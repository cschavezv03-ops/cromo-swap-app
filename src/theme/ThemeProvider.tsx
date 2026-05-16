import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, View } from 'react-native';

import { palette, type Palette, type ThemeMode } from './tokens';

type ThemeContextValue = {
  mode: ThemeMode;
  override: ThemeMode | null;
  setOverride: (next: ThemeMode | null) => void;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialOverride?: ThemeMode | null;
};

export function ThemeProvider({ children, initialOverride = null }: Props) {
  const [systemMode, setSystemMode] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );
  const [override, setOverride] = useState<ThemeMode | null>(initialOverride);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const mode: ThemeMode = override ?? systemMode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      override,
      setOverride,
      colors: palette[mode],
    }),
    [mode, override],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className={mode === 'dark' ? 'dark flex-1' : 'flex-1'}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return ctx;
}

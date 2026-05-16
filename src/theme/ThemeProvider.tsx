import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, View } from 'react-native';

import { kv, KvKey } from '@/features/storage/kv';

import { palette, type Palette, type ThemeMode } from './tokens';

type ThemeOverride = ThemeMode | null;

type ThemeContextValue = {
  mode: ThemeMode;
  override: ThemeOverride;
  setOverride: (next: ThemeOverride) => void;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readOverrideFromKv(): ThemeOverride {
  const raw = kv.getString(KvKey.themeOverride);
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

function persistOverride(next: ThemeOverride): void {
  if (next === null) kv.remove(KvKey.themeOverride);
  else kv.set(KvKey.themeOverride, next);
}

type Props = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const [systemMode, setSystemMode] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );
  const [override, setOverrideState] = useState<ThemeOverride>(readOverrideFromKv());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const setOverride = useCallback((next: ThemeOverride) => {
    setOverrideState(next);
    persistOverride(next);
  }, []);

  const mode: ThemeMode = override ?? systemMode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      override,
      setOverride,
      colors: palette[mode],
    }),
    [mode, override, setOverride],
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

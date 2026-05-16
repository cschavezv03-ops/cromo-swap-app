import { vars } from 'nativewind';
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

/**
 * Convierte un hex (#RRGGBB) a un string "R G B" para que NativeWind lo
 * interprete como CSS variable y aplique <alpha-value> de Tailwind.
 */
function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function buildVars(p: Palette) {
  return vars({
    '--color-bg': rgb(p.bg),
    '--color-surface': rgb(p.surface),
    '--color-surface-elev': rgb(p.surfaceElev),
    '--color-border': rgb(p.border),
    '--color-border-strong': rgb(p.borderStrong),
    '--color-text-primary': rgb(p.textPrimary),
    '--color-text-secondary': rgb(p.textSecondary),
    '--color-text-tertiary': rgb(p.textTertiary),
    '--color-accent': rgb(p.accent),
    '--color-accent-soft': rgb(p.accentSoft),
    '--color-success': rgb(p.success),
    '--color-warning': rgb(p.warning),
    '--color-danger': rgb(p.danger),
  });
}

const LIGHT_VARS = buildVars(palette.light);
const DARK_VARS = buildVars(palette.dark);

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

  // Inyectamos las CSS variables vía `vars()` en el style del View raíz.
  // NativeWind v4 propaga estas variables a TODOS los descendants (incluso
  // a través de portals como BottomSheet), a diferencia de la regla global
  // `:root.dark` en global.css que se rompía con portals.
  const themeStyle = mode === 'dark' ? DARK_VARS : LIGHT_VARS;

  return (
    <ThemeContext.Provider value={value}>
      <View style={[themeStyle, { flex: 1 }]} className={mode === 'dark' ? 'dark' : undefined}>
        {children}
      </View>
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

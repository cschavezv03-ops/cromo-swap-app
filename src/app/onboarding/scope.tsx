import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { useSession } from '@/lib/session-context';
import { listUniversities, setMyScope } from '@/lib/profile';
import { C, spacing, radii } from '@/theme';
import type { Database } from '@/types/database';

type UniversityRow = Database['public']['Tables']['universities']['Row'];

/**
 * Onboarding — scope selection.
 *
 * Design faithful to screens-onboarding.jsx ProfileSetupScreen step 2:
 * - 2-column grid of university chips with color accents
 * - Own university pre-selected and non-removable (greyed lock icon text)
 * - "Confirmar scope" CTA (deliberate finalisation action per R3-18)
 * - Info box showing selected count
 *
 * ui-ux-pro-max:
 * - Chips are ≥ 44pt touch targets
 * - Selected state: colored border + tinted background
 * - Disabled state (own uni) visually distinct
 * - Loading feedback on CTA
 * - Progress bar (step 4/4)
 */
export default function OnboardingScope() {
  const router = useRouter();
  const { profile, refreshProfile } = useSession();

  const [universities, setUniversities] = useState<UniversityRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingUnis, setLoadingUnis] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const myUni = profile?.university ?? null;

  useEffect(() => {
    listUniversities().then((unis) => {
      setUniversities(unis);
      // Pre-select own university (mandatory) + any previously set scope
      const initial = new Set<string>();
      if (myUni) initial.add(myUni);
      if (profile?.scope?.length) {
        profile.scope.forEach((id) => initial.add(id));
      }
      setSelected(initial);
      setLoadingUnis(false);
    });
  // profile.scope is intentionally excluded: we only want to seed this once
  // when the component mounts (based on myUni). Re-running on scope change
  // would reset the user's ongoing selections.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUni]);

  const toggleUni = (id: string) => {
    if (id === myUni) return; // own university is locked
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setError('');
    const ids = Array.from(selected);
    // Ensure own uni is always included
    if (myUni && !ids.includes(myUni)) {
      ids.push(myUni);
    }

    if (ids.length === 0) {
      setError('Seleccioná al menos tu universidad.');
      return;
    }

    setSaving(true);
    try {
      const { error: dbError } = await setMyScope(ids);
      if (dbError) {
        setError('No pudimos guardar tu selección. Intentá de nuevo.');
        return;
      }
      await refreshProfile();
      // Profile is now complete → index.tsx redirects to /(tabs)/album
      router.replace('/(tabs)/album');
    } finally {
      setSaving(false);
    }
  };

  const progress = 4 / 4;
  const selectedCount = selected.size;

  return (
    <SafeAreaView style={styles.root}>
      <GradientBackground />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.badge}>◉ Alcance · {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.heading}>¿Con qué universidades{'\n'}querés intercambiar?</Text>
        <Text style={styles.sub}>Elegí las que tengas cerca. Podés cambiarlas después.</Text>
      </View>

      {/* University grid */}
      {loadingUnis ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {chunkPairs(universities).map((pair, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {pair.map((uni) => {
                const isSelected = selected.has(uni.id);
                const isOwn = uni.id === myUni;
                const chipBg = isSelected ? uni.color + '12' : C.card;
                const chipBorder = isSelected ? uni.color : C.hairline;
                const chipBorderWidth = isSelected ? 1.5 : 1;
                const labelColor = isSelected ? uni.color : C.ink;

                return (
                  <TouchableOpacity
                    key={uni.id}
                    style={[
                      styles.chip,
                      { backgroundColor: chipBg, borderColor: chipBorder, borderWidth: chipBorderWidth },
                    ]}
                    onPress={() => toggleUni(uni.id)}
                    activeOpacity={isOwn ? 1 : 0.78}
                    disabled={isOwn}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected, disabled: isOwn }}
                    accessibilityLabel={`${uni.name}${isOwn ? ', tu universidad, seleccionada' : ''}`}
                  >
                    <Text style={[styles.chipShort, { color: labelColor }]}>{uni.short}</Text>
                    <Text style={styles.chipName} numberOfLines={2}>
                      {uni.name}
                    </Text>
                    {isOwn && (
                      <Text style={styles.chipLock}>Tu uni</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Fill empty slot if odd number */}
              {pair.length === 1 && <View style={styles.chipPlaceholder} />}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Info + CTA */}
      <View style={styles.footer}>
        {selectedCount > 0 && (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>◉</Text>
            <Text style={styles.infoText}>
              {selectedCount} universidad{selectedCount !== 1 ? 'es' : ''} en tu alcance.
              Solo verás matches, ventas y subastas de estas comunidades.
            </Text>
          </View>
        )}
        {!!error && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.btn, (selectedCount === 0 || saving) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={selectedCount === 0 || saving}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`Empezar con ${selectedCount} universidades`}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>
              Empezar con {selectedCount} universidad{selectedCount !== 1 ? 'es' : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/** Split an array into pairs for the 2-column grid */
function chunkPairs<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push(arr.slice(i, i + 2));
  }
  return result;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: {
    height: 4,
    backgroundColor: C.paper2,
    marginHorizontal: spacing[5],
    marginTop: spacing[5],
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: radii.full,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
  },
  badge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  heading: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 30,
    color: C.ink,
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
  },
  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  chip: {
    flex: 1,
    padding: spacing[4],
    borderRadius: radii.xl,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  chipPlaceholder: {
    flex: 1,
  },
  chipShort: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: spacing[1],
    fontFamily: 'Manrope_800ExtraBold',
  },
  chipName: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 15,
    flex: 1,
  },
  chipLock: {
    marginTop: spacing[1],
    fontSize: 10,
    color: C.accent,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
    gap: spacing[3],
    backgroundColor: C.paper,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: C.accentSoft,
    borderRadius: radii.lg,
    padding: spacing[3],
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: C.accent,
    lineHeight: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: C.accent,
  },
  errorText: {
    fontSize: 13,
    color: '#C73E1D',
    lineHeight: 18,
  },
  btn: {
    height: 54,
    borderRadius: radii.full,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

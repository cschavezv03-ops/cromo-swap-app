/**
 * SectionHeader — per-country header row on the album.
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │ 🇦🇷  Argentina                              ────── │  ← thin progress
 *   │      ARG · 8/15                                    │
 *   └────────────────────────────────────────────────────┘
 *
 * Faithful to Claude Design v3 screens-main.jsx (lines 83-101).
 */
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { C } from '@/theme';

interface SectionHeaderProps {
  flagEmoji: string;
  countryCode: string;
  countryName: string;
  ownedCount: number;
  total: number;
  accent: string;
}

function SectionHeaderInner({
  flagEmoji,
  countryCode,
  countryName,
  ownedCount,
  total,
  accent,
}: SectionHeaderProps) {
  const pct = total > 0 ? Math.min(100, (ownedCount / total) * 100) : 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
        paddingTop: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <Text style={{ fontSize: 22 }}>{flagEmoji}</Text>
        <View>
          <Text
            style={{
              fontFamily: 'Manrope_800ExtraBold',
              fontSize: 15,
              fontWeight: '800',
              color: C.ink,
              letterSpacing: -0.3,
            }}
          >
            {countryName}
          </Text>
          <Text
            style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 10,
              color: C.muted,
              letterSpacing: 0.3,
              marginTop: 1,
            }}
          >
            {countryCode} · {ownedCount}/{total}
          </Text>
        </View>
      </View>

      {/* Thin progress bar — accent color of the country */}
      <View
        style={{
          width: 80,
          height: 4,
          backgroundColor: C.paper2,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: accent,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

export default memo(SectionHeaderInner);

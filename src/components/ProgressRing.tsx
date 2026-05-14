/**
 * ProgressRing — SVG circular progress indicator.
 *
 * ui-ux-pro-max guidance applied:
 * - strokeDasharray/strokeDashoffset pattern for smooth circular progress
 * - C.hairline track, C.accent progress, round linecap
 * - JetBrains Mono center label (display-only, no animation in Phase 4)
 * - All colors via C palette, all spacing via tokens — no hex literals
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { C, FONTS } from '@/theme';

const SIZES = {
  sm: { size: 24, strokeWidth: 2.5, fontSize: 6 },
  md: { size: 40, strokeWidth: 3.5, fontSize: 10 },
  lg: { size: 72, strokeWidth: 5, fontSize: 16 },
} as const;

type SizeKey = keyof typeof SIZES;

interface ProgressRingProps {
  /** 0–100 */
  pct: number;
  size?: SizeKey;
  /** Show percentage label in center */
  label?: boolean;
  /** Extra thickness override */
  thickness?: number;
}

export default function ProgressRing({
  pct,
  size = 'md',
  label = false,
  thickness,
}: ProgressRingProps) {
  const { size: diameter, strokeWidth: defaultStroke, fontSize } = SIZES[size];
  const strokeWidth = thickness ?? defaultStroke;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const center = diameter / 2;

  return (
    <View style={{ width: diameter, height: diameter }}>
      <Svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={C.hairline}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress — starts from top via rotation */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={C.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
        {/* Optional center label */}
        {label && (
          <SvgText
            x={center}
            y={center + fontSize * 0.35}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily={FONTS.mono}
            fill={C.ink2}
          >
            {Math.round(pct)}%
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

// Re-export for convenience
export type { ProgressRingProps };

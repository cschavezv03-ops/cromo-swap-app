import Svg, { Path, Circle, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color: string;
  /** Stroke width in viewBox 24 units. */
  strokeWidth?: number;
};

const baseProps = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function AlbumIcon({ size = 22, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Rect x={13} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Rect x={4} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Rect x={13} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
    </Svg>
  );
}

export function MatchesIcon({ size = 22, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 8h13l-3-3 M20 16H7l3 3"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function MercadoIcon({ size = 22, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 7h14l-1.5 9.5a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 7z M9 7a3 3 0 0 1 6 0"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function AvisosIcon({ size = 22, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 9a6 6 0 0 1 12 0v4l1.5 2.5h-15L6 13V9z M10 18.5a2 2 0 0 0 4 0"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function PerfilIcon({ size = 22, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Path
        d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

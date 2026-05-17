import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color: string;
  strokeWidth?: number;
};

const baseProps = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SearchIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Path
        d="M20 20l-3.6-3.6"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline
        points="5,12.5 10,17.5 19,7"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function CrossIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 6l12 12 M18 6L6 18"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline
        points="9,5 16,12 9,19"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function SunIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Path
        d="M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4L7 17 M17 7l1.4-1.4"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function MoonIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function SystemIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Path d="M12 4a8 8 0 0 1 0 16z" fill={color} />
    </Svg>
  );
}

export function GlobeIcon({ size = 14, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Path
        d="M3.5 12h17 M12 3.5c2.5 3 2.5 14 0 17 M12 3.5c-2.5 3-2.5 14 0 17"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function BellIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
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

export function MailIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5.5} width={18} height={13} rx={2} stroke={color} strokeWidth={strokeWidth} {...baseProps} />
      <Polyline
        points="3.5,7 12,13 20.5,7"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function SwapIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 8h13 M14 5l3 3-3 3 M20 16H7 M10 13l-3 3 3 3"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function SparkleIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 4l1.6 4.6L18 10l-4.4 1.4L12 16l-1.6-4.6L6 10l4.4-1.4z M18 16l.7 1.8L20.5 18.5l-1.8.7L18 21l-.7-1.8L15.5 18.5l1.8-.7z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

export function TrophyIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 4h8v5a4 4 0 0 1-8 0V4z M16 6h2.5a1.5 1.5 0 0 1 1.5 1.5v.5a3 3 0 0 1-3 3H16 M8 6H5.5A1.5 1.5 0 0 0 4 7.5V8a3 3 0 0 0 3 3h1 M10 13h4v3h-4z M8 20h8 M10 20l2-4 2 4"
        stroke={color}
        strokeWidth={strokeWidth}
        {...baseProps}
      />
    </Svg>
  );
}

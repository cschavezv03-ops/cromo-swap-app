import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/shared/lib/cn';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'overline'
  | 'mono';

const styles: Record<Variant, string> = {
  display: 'text-4xl font-extrabold text-ink-900',
  h1: 'text-3xl font-bold text-ink-900',
  h2: 'text-2xl font-bold text-ink-900',
  h3: 'text-xl font-semibold text-ink-900',
  body: 'text-base text-ink-900',
  bodySm: 'text-sm text-ink-700',
  caption: 'text-xs text-ink-500',
  overline: 'text-2xs font-semibold uppercase tracking-widest text-ink-500',
  mono: 'text-sm font-mono text-ink-700',
};

type Props = RNTextProps & {
  variant?: Variant;
  className?: string;
};

export function Text({ variant = 'body', className, ...props }: Props) {
  return <RNText className={cn(styles[variant], className)} {...props} />;
}

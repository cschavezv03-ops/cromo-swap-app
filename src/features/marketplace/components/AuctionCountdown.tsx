import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { cn } from '@/shared/utils/cn';

import { formatCountdown } from '../lib/time';

type Props = {
  endsAt: string | null;
  className?: string;
  /** Refresca cada `tickMs` ms. Default 60_000 (1 minuto). */
  tickMs?: number;
};

/**
 * Cuenta regresiva textual ("2d 4h"). Se actualiza cada minuto para no
 * castigar la batería; los segundos solo aparecen cuando faltan <1 min.
 */
export function AuctionCountdown({ endsAt, className, tickMs = 60_000 }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick((t) => t + 1), tickMs);
    return () => clearInterval(id);
  }, [endsAt, tickMs]);

  // El re-render se dispara con `tick`, pero el valor real lo calculamos
  // ahora (Date.now()) — no necesitamos persistir nada más.
  void tick;
  const label = formatCountdown(endsAt);
  const ended = label === 'Terminó';

  return (
    <Text
      className={cn(
        'text-sm font-sans-semibold',
        ended ? 'text-text-tertiary' : 'text-text-primary',
        className,
      )}
    >
      {ended ? 'Subasta terminada' : `Termina en ${label}`}
    </Text>
  );
}

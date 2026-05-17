/**
 * Devuelve una etiqueta corta de cuenta regresiva tipo "2d 4h", "12h 30m",
 * "45m", "30s" o "Terminó" si ya pasó.
 *
 * Idioma: español neutro (sin voseo).
 */
export function formatCountdown(endsAtIso: string | null): string {
  if (!endsAtIso) return 'Sin fecha';
  const end = new Date(endsAtIso).getTime();
  const diff = end - Date.now();
  if (Number.isNaN(end)) return 'Sin fecha';
  if (diff <= 0) return 'Terminó';

  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86_400);
  const hours = Math.floor((sec % 86_400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

/** Formato amigable de moneda USD sin decimales innecesarios. */
export function formatUsd(value: number | null | undefined): string {
  if (value == null) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  if (Number.isInteger(n)) return `$${n.toLocaleString('en-US')}`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Fecha humana corta para "bloqueado hasta DATE": "17 jun".
 */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

import bundle from '../../../../assets/catalog/mundial-2026.json';

export type University = {
  id: string;
  name: string;
  short: string;
  color: string;
  email_domain: string | null;
};

const data = bundle as unknown as { universities: University[] };

export const universities: University[] = [...data.universities].sort((a, b) =>
  a.short.localeCompare(b.short),
);

export const universitiesById: Record<string, University> = Object.fromEntries(
  universities.map((u) => [u.id, u]),
);

export const universitiesByDomain: Record<string, University> = Object.fromEntries(
  universities
    .filter((u) => Boolean(u.email_domain))
    .map((u) => [u.email_domain!.toLowerCase(), u]),
);

export function detectUniversityFromEmail(email: string): University | null {
  const m = email.trim().toLowerCase().match(/^[^@\s]+@([^@\s]+)$/);
  const domain = m?.[1];
  if (!domain) return null;
  return universitiesByDomain[domain] ?? null;
}

export function isValidInstitutionalEmail(email: string): boolean {
  return detectUniversityFromEmail(email) !== null;
}

export const allowedDomains: string[] = universities
  .map((u) => u.email_domain)
  .filter((d): d is string => Boolean(d));

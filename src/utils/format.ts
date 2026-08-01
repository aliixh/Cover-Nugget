// Small display helpers.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** ISO timestamp -> e.g. "July 2026". Falls back to the raw string if invalid. */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** ISO timestamp -> e.g. "July 31, 2026". Falls back to the raw string. */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Display name for a cover letter: its title, else a company/role fallback. */
export function coverLetterTitle(l: {
  title?: string | null;
  company?: string | null;
  role?: string | null;
}): string {
  const t = l.title?.trim();
  if (t) return t;
  const c = l.company?.trim();
  const r = l.role?.trim();
  if (c && r) return `${c} — ${r}`;
  return c || r || "Untitled Cover Letter";
}

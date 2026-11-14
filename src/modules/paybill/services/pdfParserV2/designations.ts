/**
 * Known Gujarat government post/designation patterns + matcher used by the
 * row splitters. Ordered most-specific first.
 */
export const DESIGNATION_PATTERNS = [
  /\b(Deputy\s+Director\s*\([^)]+\))/i,
  /\b(Assistant\s+Director\s*\([^)]+\))/i,
  /\b(Joint\s+Director\s*\([^)]+\))/i,
  /\b(Senior\s+Veterinary\s+Officer\s*\([^)]+\))/i,
  /\b(Veterinary\s+Officer\s*\([^)]+\))/i,
  /\b(Deputy\s+Director)\b/i,
  /\b(Assistant\s+Director)\b/i,
  /\b(Joint\s+Director)\b/i,
  /\b(Director)\b/i,
  /\b(Office\s+Superintendent)\b/i,
  /\b(Superintendent)\b/i,
  /\b(Statistical\s+Inspector)\b/i,
  /\b(Statistical\s+Assistant)\b/i,
  /\b(Statistical\s+Officer)\b/i,
  /\b(Research\s+Assistant)\b/i,
  /\b(Junior\s+Accountant)\b/i,
  /\b(Senior\s+Accountant)\b/i,
  /\b(Accountant)\b/i,
  /\b(Senior\s+Clerk)\b/i,
  /\b(Junior\s+Clerk)\b/i,
  /\b(Head\s+Clerk)\b/i,
  /\b(Clerk\s+cum\s+Typist)\b/i,
  /\b(Clerk)\b/i,
  /\b(Typist)\b/i,
  /\b(Stenographer)\b/i,
  /\b(Driver\s+cum\s+Mechanic)\b/i,
  /\b(Driver)\b/i,
  /\b(Peon\s+cum\s+Chowkidar)\b/i,
  /\b(Peon)\b/i,
  /\b(Chowkidar)\b/i,
  /\b(Sweeper)\b/i,
  /\b(Watchman)\b/i,
  /\b(Animal\s+Attendant)\b/i,
  /\b(Dresser)\b/i,
  /\b(Attendant)\b/i,
  /\b(Senior\s+Veterinary\s+Officer)\b/i,
  /\b(Veterinary\s+Officer)\b/i,
  /\b(Veterinary\s+Doctor)\b/i,
  /\b(Live\s*Stock\s+Inspector)\b/i,
  /\b(Live\s*Stock\s+Supervisor)\b/i,
  /\b(Administrative\s+Officer)\b/i,
  /\b(Accounts\s+Officer)\b/i,
  /\b(Audit\s+Officer)\b/i,
  /\b(Section\s+Officer)\b/i,
  /\b(Technical\s+Assistant)\b/i,
  /\b(Lab\s+Assistant)\b/i,
  /\b(Field\s+Assistant)\b/i,
  /\b(Executive\s+Engineer)\b/i,
  /\b(Assistant\s+Engineer)\b/i,
  /\b(Junior\s+Engineer)\b/i,
  /\b(Inspector)\b/i,
  /\b(Assistant)\b/i,
  /\b(Operator)\b/i,
  /\b(Officer)\b/i,
];

export function findDesignation(text: string): string {
  for (const p of DESIGNATION_PATTERNS) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

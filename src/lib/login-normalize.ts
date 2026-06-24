const aliasMap: Record<string, string> = {
  admin: 'manarahinstitute01@gmail.com',
  teacher: 'teacher@stitchhms.com',
  student: 'student@stitchhms.com',
  parent: 'parent@stitchhms.com',
  'system admin': 'manarahinstitute01@gmail.com'
};

export function normalizeLoginIdentifier(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('@')) return raw;
  return aliasMap[raw] ?? raw;
}

export function normalizePassword(value: unknown) {
  return String(value ?? '').trim();
}


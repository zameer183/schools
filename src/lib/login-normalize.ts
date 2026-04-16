const aliasMap: Record<string, string> = {
  admin: 'admin@stitchhms.com',
  teacher: 'teacher@stitchhms.com',
  student: 'student@stitchhms.com',
  parent: 'parent@stitchhms.com',
  'system admin': 'admin@stitchhms.com'
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

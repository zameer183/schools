export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escaped = (value: unknown) => {
    const stringValue = String(value ?? '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headerRow = headers.join(',');
  const bodyRows = rows.map((row) => headers.map((h) => escaped(row[h])).join(','));

  return [headerRow, ...bodyRows].join('\n');
}

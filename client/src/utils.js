export function exportCsv(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) lines.push(row.map(esc).join(','));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Clicking an <a> that was never attached to the document is unreliable —
  // it silently does nothing in Firefox and most Safari/webview builds, and
  // only happens to work in some Chrome versions. Attaching it (even
  // invisibly) before the click, then cleaning up right after, is what
  // makes the download actually fire everywhere.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;

// Sorts alphabetically, but puts entries that start with Arabic letters
// before entries that start with English/Latin letters.
export function sortArabicFirst(list, keyFn = (x) => x) {
  const arabic = [];
  const other = [];
  for (const item of list) {
    const key = String(keyFn(item) || "").trim();
    if (ARABIC_RE.test(key.charAt(0))) arabic.push(item);
    else other.push(item);
  }
  arabic.sort((a, b) => String(keyFn(a)).localeCompare(String(keyFn(b)), "ar"));
  other.sort((a, b) => String(keyFn(a)).localeCompare(String(keyFn(b)), "en"));
  return [...arabic, ...other];
}

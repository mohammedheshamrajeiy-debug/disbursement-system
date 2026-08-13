import * as XLSX from 'xlsx';
import path from 'path';

export function colStringToIndex(colStr) {
  let result = 0;
  for (const ch of String(colStr).toUpperCase()) {
    result = result * 26 + (ch.charCodeAt(0) - 65 + 1);
  }
  return result - 1;
}

export function indexToColString(index) {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/,/g, '').replace(/٬/g, '');
    const num = cleaned.replace(/[^\d.\-]/g, '');
    if (num) {
      const parsed = Number(num);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

export function readWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  return wb;
}

export function getSheetNames(wb) {
  return wb.SheetNames;
}

export function readSheet(wb, sheetName = null) {
  const name = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[name];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
}

export function getHeaderRow(wb, sheetName = null) {
  const data = readSheet(wb, sheetName);
  if (!data.length) return [];
  return data[0].map((c) => (c === null || c === undefined ? '' : String(c).trim()));
}

export function extractAllRows(wb, sheetName = null) {
  const headers = getHeaderRow(wb, sheetName);
  const data = readSheet(wb, sheetName);
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = { row: i + 1 };
    for (let h = 0; h < headers.length; h++) {
      obj[headers[h]] = row[h] === null || row[h] === undefined ? '' : String(row[h]);
    }
    rows.push(obj);
  }
  return rows;
}

export function extractAllNumbers(wb, sheetName = null) {
  const data = readSheet(wb, sheetName);
  const results = [];
  for (let r = 0; r < data.length; r++) {
    const row = data[r] || [];
    for (let c = 0; c < row.length; c++) {
      const parsed = parseNumber(row[c]);
      if (parsed !== null) {
        results.push({
          cell: `${indexToColString(c)}${r + 1}`,
          value: parsed,
          raw: row[c],
          row: r + 1,
          col: c + 1,
        });
      }
    }
  }
  return results;
}

export function exportData(data, sheetName = 'Data') {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export { parseNumber, colStringToIndex as columnToIndex };

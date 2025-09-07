import path from 'path';
import { mkdir, appendFile, readFile } from 'fs/promises';

const DEFAULT_LEDGER_PATH =
  process.env.LEDGER_PATH || path.join(process.cwd(), 'ops', 'ledger', 'attendee-events.jsonl');

function stripBom(s) {
  return s && s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

export async function appendLedger(row, filePath = DEFAULT_LEDGER_PATH) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify(row) + '\r\n';
  await appendFile(filePath, line, { encoding: 'utf8' });
}

export async function readLastN(n = 50, filePath = DEFAULT_LEDGER_PATH) {
  try {
    const txt = stripBom(await readFile(filePath, 'utf8'));
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const tail = lines.slice(-Math.max(1, n));
    return tail
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function readAll(filePath = DEFAULT_LEDGER_PATH) {
  try {
    const txt = stripBom(await readFile(filePath, 'utf8'));
    const lines = txt.split(/\r?\n/).filter(Boolean);
    return lines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

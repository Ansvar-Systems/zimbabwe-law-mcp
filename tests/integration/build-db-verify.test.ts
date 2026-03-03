import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/database.db');

describe('database build verification', () => {
  it('database file exists', () => {
    expect(existsSync(DB_PATH)).toBe(true);
  });

  it('legal_documents has chapter_number column', () => {
    const db = new Database(DB_PATH, { readonly: true });
    const cols = db.prepare("PRAGMA table_info(legal_documents)").all() as { name: string }[];
    expect(cols.some(c => c.name === 'chapter_number')).toBe(true);
    db.close();
  });

  it('chapter_number is populated for known statutes', () => {
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare("SELECT chapter_number FROM legal_documents WHERE id = 'zw-cyber-and-data-protection-act-2021'").get() as { chapter_number: string } | undefined;
    expect(row?.chapter_number).toBe('12:07');
    db.close();
  });

  it('dates are populated where derivable', () => {
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) as cnt FROM legal_documents WHERE issued_date IS NOT NULL AND issued_date != ''").get() as { cnt: number };
    expect(row.cnt).toBeGreaterThan(0);
    db.close();
  });
});

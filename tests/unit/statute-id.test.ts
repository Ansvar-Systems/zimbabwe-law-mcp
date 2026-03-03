import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { resolveDocumentId } from '../../src/utils/statute-id.js';

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE legal_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_en TEXT,
      short_name TEXT,
      chapter_number TEXT
    );
    CREATE INDEX idx_documents_chapter ON legal_documents(chapter_number);
    INSERT INTO legal_documents VALUES
      ('zw-cyber-and-data-protection-act-2021', 'Cyber and Data Protection Act, 2021', 'Cyber and Data Protection Act, 2021', 'Cyber and Data Protection A...', '12:07'),
      ('zw-criminal-law-codification-and-reform-act', 'Criminal Law (Codification and Reform) Act', 'Criminal Law (Codification and Reform) Act', 'Criminal Law (Codification ...', '9:23'),
      ('zw-labour-act', 'Labour Act', 'Labour Act', 'Labour Act', '28:01');
  `);
});

afterAll(() => {
  db.close();
});

describe('resolveDocumentId', () => {
  it('resolves direct ID', () => {
    expect(resolveDocumentId(db as any, 'zw-cyber-and-data-protection-act-2021'))
      .toBe('zw-cyber-and-data-protection-act-2021');
  });

  it('resolves chapter number with prefix', () => {
    expect(resolveDocumentId(db as any, 'Chapter 12:07'))
      .toBe('zw-cyber-and-data-protection-act-2021');
  });

  it('resolves bare chapter number', () => {
    expect(resolveDocumentId(db as any, '9:23'))
      .toBe('zw-criminal-law-codification-and-reform-act');
  });

  it('resolves title with exact punctuation', () => {
    expect(resolveDocumentId(db as any, 'Cyber and Data Protection Act, 2021'))
      .toBe('zw-cyber-and-data-protection-act-2021');
  });

  it('resolves title WITHOUT punctuation (comma missing)', () => {
    expect(resolveDocumentId(db as any, 'Cyber and Data Protection Act 2021'))
      .toBe('zw-cyber-and-data-protection-act-2021');
  });

  it('resolves partial title', () => {
    expect(resolveDocumentId(db as any, 'Labour Act'))
      .toBe('zw-labour-act');
  });

  it('resolves case-insensitively', () => {
    expect(resolveDocumentId(db as any, 'labour act'))
      .toBe('zw-labour-act');
  });

  it('returns null for unknown document', () => {
    expect(resolveDocumentId(db as any, 'Nonexistent Act 2025')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveDocumentId(db as any, '')).toBeNull();
  });
});

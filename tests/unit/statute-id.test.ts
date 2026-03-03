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
      ('zw-cyber-and-data-protection-act-2021', 'Cyber and Data Protection Act, 2021', 'Cyber and Data Protection Act, 2021', 'CDPA', '12:07'),
      ('zw-criminal-law-codification-and-reform-act', 'Criminal Law (Codification and Reform) Act', 'Criminal Law (Codification and Reform) Act', 'Criminal Law (Codification ...', '9:23'),
      ('zw-labour-act', 'Labour Act', 'Labour Act', 'Labour Act', '28:01'),
      ('zw-finance-act', 'Finance Act, 2020', 'Finance Act, 2020', NULL, NULL),
      ('zw-agricultural-finance-act', 'Agricultural Finance Act', 'Agricultural Finance Act', NULL, NULL),
      ('zw-insurance-act', 'Insurance Act', 'Insurance Act', NULL, NULL),
      ('zw-export-credit-reinsurance-act', 'Export Credit Reinsurance Act', 'Export Credit Reinsurance Act', NULL, NULL);

    CREATE TABLE legal_provisions (
      id INTEGER PRIMARY KEY,
      document_id TEXT REFERENCES legal_documents(id),
      provision_ref TEXT,
      chapter TEXT,
      section TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      order_index INTEGER
    );
    INSERT INTO legal_provisions (document_id, provision_ref, section, content) VALUES
      ('zw-cyber-and-data-protection-act-2021', 's1', '1', 'This Act may be cited as the Cyber and Data Protection Act [Chapter 12:07].'),
      ('zw-criminal-law-codification-and-reform-act', 's1', '1', 'This Act may be cited as the Criminal Law (Codification and Reform) Act [Chapter 9:23].'),
      ('zw-labour-act', 's1', '1', 'This Act may be cited as the Labour Act [Chapter 28:01].');
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

  it('resolves abbreviation (CDPA)', () => {
    expect(resolveDocumentId(db as any, 'CDPA'))
      .toBe('zw-cyber-and-data-protection-act-2021');
  });

  it('resolves abbreviation case-insensitively', () => {
    expect(resolveDocumentId(db as any, 'cdpa'))
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

  it('resolves title WITHOUT comma (Act YYYY normalization)', () => {
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

  it('prefers exact title over substring match — "Finance Act" not "Agricultural Finance Act"', () => {
    expect(resolveDocumentId(db as any, 'Finance Act'))
      .toBe('zw-finance-act');
  });

  it('prefers exact title over substring match — "Insurance Act" not "Export Credit Reinsurance Act"', () => {
    expect(resolveDocumentId(db as any, 'Insurance Act'))
      .toBe('zw-insurance-act');
  });

  it('picks shortest match when no exact match (ambiguous substring)', () => {
    // Both "Finance Act, 2020" and "Agricultural Finance Act" contain "Finance"
    // but "Finance Act, 2020" is shorter → correct pick
    expect(resolveDocumentId(db as any, 'Finance'))
      .toBe('zw-finance-act');
  });

  it('returns null for unknown document', () => {
    expect(resolveDocumentId(db as any, 'Nonexistent Act 2025')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveDocumentId(db as any, '')).toBeNull();
  });
});

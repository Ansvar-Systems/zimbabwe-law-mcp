import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { formatCitationTool } from '../../src/tools/format-citation.js';

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE legal_documents (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, title_en TEXT,
      short_name TEXT, chapter_number TEXT
    );
    CREATE TABLE legal_provisions (
      id INTEGER PRIMARY KEY, document_id TEXT, provision_ref TEXT,
      chapter TEXT, section TEXT NOT NULL, title TEXT, content TEXT NOT NULL, order_index INTEGER
    );
    INSERT INTO legal_documents VALUES
      ('zw-cyber-and-data-protection-act-2021', 'Cyber and Data Protection Act, 2021', 'Cyber and Data Protection Act, 2021', 'CDPA', '12:07'),
      ('zw-criminal-law-codification-and-reform-act', 'Criminal Law (Codification and Reform) Act [Chapter 9:23]', 'Criminal Law (Codification and Reform) Act', NULL, '9:23');
    INSERT INTO legal_provisions (document_id, provision_ref, section, content) VALUES
      ('zw-cyber-and-data-protection-act-2021', 's1', '1', 'This Act may be cited as the Cyber and Data Protection Act [Chapter 12:07].'),
      ('zw-criminal-law-codification-and-reform-act', 's1', '1', 'This Act may be cited as the Criminal Law (Codification and Reform) Act [Chapter 9:23].');
  `);
});

afterAll(() => { db.close(); });

describe('formatCitationTool', () => {
  it('formats full citation with DB resolution', async () => {
    const result = await formatCitationTool({ citation: 's 29 Cyber and Data Protection Act', format: 'full' }, db as any);
    expect(result.formatted).toBe('Section 29, Cyber and Data Protection Act, 2021');
  });

  it('formats short citation — drops year, keeps title', async () => {
    const result = await formatCitationTool({ citation: 'Section 29, Cyber and Data Protection Act, 2021', format: 'short' }, db as any);
    expect(result.formatted).toBe('s 29, Cyber and Data Protection Act');
  });

  it('short format preserves parentheticals', async () => {
    const result = await formatCitationTool({ citation: 'Section 3, Criminal Law (Codification and Reform) Act', format: 'short' }, db as any);
    expect(result.formatted).toContain('(Codification and Reform)');
  });

  it('short format strips chapter annotations', async () => {
    const result = await formatCitationTool({ citation: 'Section 3, Criminal Law (Codification and Reform) Act [Chapter 9:23]', format: 'short' }, db as any);
    expect(result.formatted).not.toContain('[Chapter');
  });

  it('formats pinpoint', async () => {
    const result = await formatCitationTool({ citation: 'Section 29, Cyber and Data Protection Act, 2021', format: 'pinpoint' }, db as any);
    expect(result.formatted).toBe('Section 29');
  });

  it('works without db (fallback to string manipulation)', async () => {
    const result = await formatCitationTool({ citation: 's 5 Some Act', format: 'full' });
    expect(result.formatted).toBe('Section 5, Some Act');
  });
});

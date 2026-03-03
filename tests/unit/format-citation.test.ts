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
    INSERT INTO legal_documents VALUES
      ('zw-cyber-and-data-protection-act-2021', 'Cyber and Data Protection Act, 2021', 'Cyber and Data Protection Act, 2021', 'CDPA', '12:07');
  `);
});

afterAll(() => { db.close(); });

describe('formatCitationTool', () => {
  it('formats full citation with DB resolution', async () => {
    const result = await formatCitationTool({ citation: 's 29 Cyber and Data Protection Act', format: 'full' }, db as any);
    expect(result.formatted).toBe('Section 29, Cyber and Data Protection Act, 2021');
  });

  it('formats short citation', async () => {
    const result = await formatCitationTool({ citation: 'Section 29, Cyber and Data Protection Act, 2021', format: 'short' }, db as any);
    expect(result.formatted).toContain('s 29');
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

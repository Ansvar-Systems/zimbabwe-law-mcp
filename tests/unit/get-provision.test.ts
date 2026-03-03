import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { getProvision } from '../../src/tools/get-provision.js';

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE legal_documents (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'statute',
      title TEXT NOT NULL, title_en TEXT, short_name TEXT,
      chapter_number TEXT,
      status TEXT NOT NULL DEFAULT 'in_force', issued_date TEXT,
      in_force_date TEXT, url TEXT, description TEXT, last_updated TEXT
    );
    CREATE TABLE legal_provisions (
      id INTEGER PRIMARY KEY, document_id TEXT NOT NULL,
      provision_ref TEXT NOT NULL, chapter TEXT, section TEXT NOT NULL,
      title TEXT, content TEXT NOT NULL, metadata TEXT
    );
    CREATE TABLE db_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO db_metadata VALUES ('tier', 'free'), ('schema_version', '2'), ('built_at', '2026-03-03');

    INSERT INTO legal_documents (id, title, status) VALUES ('zw-test-act', 'Test Act', 'in_force');
    INSERT INTO legal_provisions (document_id, provision_ref, section, title, content) VALUES
      ('zw-test-act', 's13', '13', 'Registration', '(1) Every data controller shall register. (2) The Authority shall maintain a register.');
  `);
});

afterAll(() => { db.close(); });

describe('getProvision', () => {
  it('resolves section by number', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act', section: '13' });
    expect(result.results.length).toBe(1);
    expect(result.results[0].provision_ref).toBe('s13');
  });

  it('resolves section with subsection suffix stripped', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act', section: '13(1)' });
    expect(result.results.length).toBe(1);
    expect(result.results[0].provision_ref).toBe('s13');
  });

  it('resolves provision_ref with s prefix and subsection', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act', provision_ref: 's13(2)' });
    expect(result.results.length).toBe(1);
    expect(result.results[0].provision_ref).toBe('s13');
  });

  it('resolves nested subsection references like s13(2)(a)', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act', provision_ref: 's13(2)(a)' });
    expect(result.results.length).toBe(1);
    expect(result.results[0].provision_ref).toBe('s13');
  });

  it('resolves deeply nested subsection 13(1)(b)(ii)', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act', section: '13(1)(b)(ii)' });
    expect(result.results.length).toBe(1);
    expect(result.results[0].provision_ref).toBe('s13');
  });

  it('returns empty for nonexistent section', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act', section: '999' });
    expect(result.results.length).toBe(0);
  });

  it('returns all provisions when no section specified', async () => {
    const result = await getProvision(db as any, { document_id: 'zw-test-act' });
    expect(result.results.length).toBe(1);
  });
});

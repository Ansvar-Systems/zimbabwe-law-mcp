import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { buildLegalStance } from '../../src/tools/build-legal-stance.js';

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE legal_documents (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'statute',
      title TEXT NOT NULL, title_en TEXT, short_name TEXT,
      status TEXT NOT NULL DEFAULT 'in_force', issued_date TEXT,
      in_force_date TEXT, url TEXT, description TEXT, last_updated TEXT
    );
    CREATE TABLE legal_provisions (
      id INTEGER PRIMARY KEY, document_id TEXT NOT NULL,
      provision_ref TEXT NOT NULL, chapter TEXT, section TEXT NOT NULL,
      title TEXT, content TEXT NOT NULL, metadata TEXT
    );
    CREATE VIRTUAL TABLE provisions_fts USING fts5(
      content, title, content='legal_provisions', content_rowid='id', tokenize='unicode61'
    );
    CREATE TRIGGER provisions_ai AFTER INSERT ON legal_provisions BEGIN
      INSERT INTO provisions_fts(rowid, content, title) VALUES (new.id, new.content, new.title);
    END;
    CREATE TABLE db_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO db_metadata VALUES ('tier', 'free'), ('schema_version', '2'), ('built_at', '2026-03-03');

    INSERT INTO legal_documents (id, title, status) VALUES ('zw-test-act', 'Test Act', 'in_force');
    INSERT INTO legal_provisions (document_id, provision_ref, section, title, content) VALUES
      ('zw-test-act', 's10', '10', 'Interception', 'The interception of communications shall require a warrant issued by a judge of the High Court.'),
      ('zw-test-act', 's11', '11', 'Surveillance', 'Surveillance of electronic communications shall be conducted only under authority of law.');
  `);
});

afterAll(() => { db.close(); });

describe('buildLegalStance', () => {
  it('finds results for single keyword', async () => {
    const result = await buildLegalStance(db as any, { query: 'interception' });
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('finds results for multi-word query via OR or LIKE fallback', async () => {
    const result = await buildLegalStance(db as any, { query: 'interception communications surveillance' });
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('returns empty for nonsense query', async () => {
    const result = await buildLegalStance(db as any, { query: 'xyznonexistent' });
    expect(result.results).toEqual([]);
  });
});

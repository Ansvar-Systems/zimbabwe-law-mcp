import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { searchLegislation } from '../../src/tools/search-legislation.js';

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE legal_documents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'statute',
      title TEXT NOT NULL,
      title_en TEXT,
      short_name TEXT,
      status TEXT NOT NULL DEFAULT 'in_force',
      issued_date TEXT,
      in_force_date TEXT,
      url TEXT,
      description TEXT,
      last_updated TEXT
    );
    CREATE TABLE legal_provisions (
      id INTEGER PRIMARY KEY,
      document_id TEXT NOT NULL,
      provision_ref TEXT NOT NULL,
      chapter TEXT,
      section TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      metadata TEXT
    );
    CREATE VIRTUAL TABLE provisions_fts USING fts5(
      content, title,
      content='legal_provisions',
      content_rowid='id',
      tokenize='unicode61'
    );
    CREATE TRIGGER provisions_ai AFTER INSERT ON legal_provisions BEGIN
      INSERT INTO provisions_fts(rowid, content, title)
      VALUES (new.id, new.content, new.title);
    END;
    CREATE TABLE db_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO db_metadata VALUES ('tier', 'free'), ('schema_version', '2'), ('built_at', '2026-03-03');

    INSERT INTO legal_documents (id, title, status) VALUES
      ('zw-test-act', 'Test Act', 'in_force');
    INSERT INTO legal_provisions (document_id, provision_ref, section, title, content) VALUES
      ('zw-test-act', 's1', '1', 'Penalties', 'Any person who commits an offence shall be liable to imprisonment for a period not exceeding five years or a fine.'),
      ('zw-test-act', 's2', '2', 'General', 'The Minister may make regulations for the general administration of this Act.');
  `);
});

afterAll(() => {
  db.close();
});

describe('searchLegislation', () => {
  it('finds results with single keyword', async () => {
    const result = await searchLegislation(db as any, { query: 'imprisonment' });
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('finds results with multi-word query via OR or LIKE fallback', async () => {
    const result = await searchLegislation(db as any, { query: 'penalties imprisonment' });
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('returns empty for nonsense query', async () => {
    const result = await searchLegislation(db as any, { query: 'xyznonexistent' });
    expect(result.results).toEqual([]);
  });

  it('returns empty for empty query', async () => {
    const result = await searchLegislation(db as any, { query: '' });
    expect(result.results).toEqual([]);
  });
});

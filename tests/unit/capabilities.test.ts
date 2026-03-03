import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { detectCapabilities } from '../../src/capabilities.js';

describe('detectCapabilities', () => {
  it('does not report eu_references when tables exist but are empty', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE legal_documents (id TEXT PRIMARY KEY, title TEXT);
      CREATE TABLE legal_provisions (id INTEGER PRIMARY KEY, document_id TEXT, content TEXT);
      CREATE TABLE provisions_fts (content TEXT);
      CREATE TABLE eu_documents (id TEXT PRIMARY KEY);
      CREATE TABLE eu_references (id INTEGER PRIMARY KEY, eu_document_id TEXT);
    `);
    const caps = detectCapabilities(db as any);
    expect(caps.has('core_legislation')).toBe(true);
    expect(caps.has('eu_references')).toBe(false);
    db.close();
  });

  it('reports eu_references when tables have data', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE legal_documents (id TEXT PRIMARY KEY, title TEXT);
      CREATE TABLE legal_provisions (id INTEGER PRIMARY KEY, document_id TEXT, content TEXT);
      CREATE TABLE provisions_fts (content TEXT);
      CREATE TABLE eu_documents (id TEXT PRIMARY KEY);
      CREATE TABLE eu_references (id INTEGER PRIMARY KEY, eu_document_id TEXT);
      INSERT INTO eu_documents VALUES ('regulation:2016/679');
      INSERT INTO eu_references VALUES (1, 'regulation:2016/679');
    `);
    const caps = detectCapabilities(db as any);
    expect(caps.has('eu_references')).toBe(true);
    db.close();
  });

  it('reports core_legislation when tables exist', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE legal_documents (id TEXT PRIMARY KEY, title TEXT);
      CREATE TABLE legal_provisions (id INTEGER PRIMARY KEY, document_id TEXT, content TEXT);
      CREATE TABLE provisions_fts (content TEXT);
    `);
    const caps = detectCapabilities(db as any);
    expect(caps.has('core_legislation')).toBe(true);
    expect(caps.has('eu_references')).toBe(false);
    db.close();
  });
});

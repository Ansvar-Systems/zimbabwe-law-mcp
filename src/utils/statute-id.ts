/**
 * Statute ID resolution for Zimbabwe Law MCP.
 *
 * Resolves fuzzy document references (titles, chapter numbers) to database document IDs.
 */

import type Database from '@ansvar/mcp-sqlite';

/**
 * Resolve a document identifier to a database document ID.
 * Supports:
 * - Direct ID match (e.g., "zw-cyber-data-protection-2021")
 * - Chapter number match (e.g., "Chapter 9:23", "9:23")
 * - Title substring match (e.g., "Cyber and Data Protection", "CDPA")
 */
export function resolveDocumentId(
  db: InstanceType<typeof Database>,
  input: string,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct ID match
  const directMatch = db.prepare(
    'SELECT id FROM legal_documents WHERE id = ?'
  ).get(trimmed) as { id: string } | undefined;
  if (directMatch) return directMatch.id;

  // Chapter number match (e.g., "Chapter 9:23" or just "9:23")
  const chapterMatch = trimmed.match(/(?:Chapter\s+)?(\d+:\d+)/i);
  if (chapterMatch) {
    const chapterNum = chapterMatch[1];
    const chResult = db.prepare(
      "SELECT id FROM legal_documents WHERE short_name LIKE ? OR title LIKE ? LIMIT 1"
    ).get(`%${chapterNum}%`, `%${chapterNum}%`) as { id: string } | undefined;
    if (chResult) return chResult.id;
  }

  // Title/short_name fuzzy match
  const titleResult = db.prepare(
    "SELECT id FROM legal_documents WHERE title LIKE ? OR short_name LIKE ? OR title_en LIKE ? LIMIT 1"
  ).get(`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`) as { id: string } | undefined;
  if (titleResult) return titleResult.id;

  // Case-insensitive fallback
  const lowerResult = db.prepare(
    "SELECT id FROM legal_documents WHERE LOWER(title) LIKE LOWER(?) OR LOWER(short_name) LIKE LOWER(?) OR LOWER(title_en) LIKE LOWER(?) LIMIT 1"
  ).get(`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`) as { id: string } | undefined;
  if (lowerResult) return lowerResult.id;

  return null;
}

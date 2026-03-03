/**
 * Statute ID resolution for Zimbabwe Law MCP.
 *
 * Resolves fuzzy document references (titles, chapter numbers) to database document IDs.
 */

import type Database from '@ansvar/mcp-sqlite';

/**
 * Strip punctuation that commonly differs between user input and stored titles.
 * E.g., "Act, 2021" vs "Act 2021", "Law (Reform)" vs "Law Reform"
 */
function normalizePunctuation(s: string): string {
  return s.replace(/[,;:.()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Resolve a document identifier to a database document ID.
 * Supports:
 * - Direct ID match (e.g., "zw-cyber-data-protection-2021")
 * - Chapter number match (e.g., "Chapter 9:23", "9:23")
 * - Title substring match (e.g., "Cyber and Data Protection Act 2021")
 * - Punctuation-normalized match (handles missing commas, parentheses, etc.)
 */
export function resolveDocumentId(
  db: InstanceType<typeof Database>,
  input: string,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Direct ID match
  const directMatch = db.prepare(
    'SELECT id FROM legal_documents WHERE id = ?'
  ).get(trimmed) as { id: string } | undefined;
  if (directMatch) return directMatch.id;

  // 2. Chapter number match — first try dedicated column, then fallback to title/short_name
  const chapterMatch = trimmed.match(/(?:Chapter\s+)?(\d+:\d+)/i);
  if (chapterMatch) {
    const chapterNum = chapterMatch[1];

    // Try chapter_number column first
    try {
      const chResult = db.prepare(
        "SELECT id FROM legal_documents WHERE chapter_number = ? LIMIT 1"
      ).get(chapterNum) as { id: string } | undefined;
      if (chResult) return chResult.id;
    } catch {
      // column may not exist in older schemas
    }

    // Fallback: search title/short_name
    const chFallback = db.prepare(
      "SELECT id FROM legal_documents WHERE short_name LIKE ? OR title LIKE ? LIMIT 1"
    ).get(`%${chapterNum}%`, `%${chapterNum}%`) as { id: string } | undefined;
    if (chFallback) return chFallback.id;
  }

  // 3. Title/short_name/title_en LIKE match (exact punctuation)
  const titleResult = db.prepare(
    "SELECT id FROM legal_documents WHERE title LIKE ? OR short_name LIKE ? OR title_en LIKE ? LIMIT 1"
  ).get(`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`) as { id: string } | undefined;
  if (titleResult) return titleResult.id;

  // 4. Punctuation-normalized match — strip commas, semicolons, periods, parens
  //    Always try this: the input may lack punctuation that the stored title has, or vice versa.
  const normalized = normalizePunctuation(trimmed);
  {
    const allDocs = db.prepare(
      "SELECT id, title, title_en, short_name FROM legal_documents"
    ).all() as { id: string; title: string; title_en: string | null; short_name: string | null }[];

    const normalizedLower = normalized.toLowerCase();
    for (const doc of allDocs) {
      const fields = [doc.title, doc.title_en, doc.short_name].filter(Boolean) as string[];
      for (const field of fields) {
        if (normalizePunctuation(field).toLowerCase().includes(normalizedLower)) {
          return doc.id;
        }
      }
    }
  }

  // 5. Case-insensitive LIKE fallback
  const lowerResult = db.prepare(
    "SELECT id FROM legal_documents WHERE LOWER(title) LIKE LOWER(?) OR LOWER(short_name) LIKE LOWER(?) OR LOWER(title_en) LIKE LOWER(?) LIMIT 1"
  ).get(`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`) as { id: string } | undefined;
  if (lowerResult) return lowerResult.id;

  return null;
}

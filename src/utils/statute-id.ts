/**
 * Statute ID resolution for Zimbabwe Law MCP.
 *
 * Resolves fuzzy document references (titles, chapter numbers) to database document IDs.
 * 9-step cascade: direct ID → abbreviation → chapter (provision) → exact title match
 *   → shortest LIKE → case-insensitive shortest LIKE → short-name
 *   → punctuation-normalized scan (shortest) → null.
 *
 * Steps 5-8 use shortest-match ranking to prevent "Finance Act" resolving to
 * "Agricultural Finance Act" when "Finance Act, 2020" exists.
 */

import type Database from '@ansvar/mcp-sqlite';

/** Well-known abbreviations for Zimbabwean statutes. */
const ABBREVIATIONS: Record<string, string> = {
  'CDPA': 'zw-cyber-and-data-protection-act-2021',
  'AIPPA': 'zw-freedom-of-information-act-2020',
  'POSA': 'zw-maintenance-of-peace-and-order-act-2019',
  'EMA': 'zw-environmental-management-act',
  'NSSA': 'zw-national-social-security-authority-act',
  'ZIDA': 'zw-zimbabwe-investment-and-development-agency-act-2019',
  'BSA': 'zw-broadcasting-services-act',
  'ICA': 'zw-interception-of-communications-act',
};

/** Lazy-built map of chapter numbers to document IDs, extracted from s1 provisions. */
let chapterProvisionLookup: Map<string, string> | null = null;

function buildChapterProvisionLookup(db: InstanceType<typeof Database>): Map<string, string> {
  const lookup = new Map<string, string>();
  try {
    const rows = db.prepare(
      "SELECT document_id, content FROM legal_provisions WHERE provision_ref = 's1' AND content LIKE '%[Chapter %:%]%'"
    ).all() as { document_id: string; content: string }[];
    for (const row of rows) {
      const m = row.content.match(/\[Chapter\s+(\d+:\d+)\]/);
      if (m) lookup.set(m[1], row.document_id);
    }
  } catch {
    // legal_provisions table may not exist in test fixtures
  }
  return lookup;
}

/**
 * Normalize "Act YYYY" → "Act, YYYY" to match stored title format.
 * Negative lookahead prevents double-comma on "Act, 2021".
 */
function normalizeActTitle(input: string): string {
  return input.replace(/\bAct\s+(?!,)(\d{4})\b/gi, 'Act, $1');
}

/**
 * Strip punctuation that commonly differs between user input and stored titles.
 */
function normalizePunctuation(s: string): string {
  return s.replace(/[,;:.()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Resolve a document identifier to a database document ID.
 * 8-step cascade handles abbreviations, chapter numbers from provision content,
 * "Act YYYY" normalization, and punctuation-normalized fallback.
 */
export function resolveDocumentId(
  db: InstanceType<typeof Database>,
  input: string,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Step 1: Direct ID match
  const directMatch = db.prepare(
    'SELECT id FROM legal_documents WHERE id = ?'
  ).get(trimmed) as { id: string } | undefined;
  if (directMatch) return directMatch.id;

  // Step 2: Abbreviation map
  const abbr = ABBREVIATIONS[trimmed.toUpperCase()];
  if (abbr) {
    // Verify the ID exists in this database
    const abbrCheck = db.prepare(
      'SELECT id FROM legal_documents WHERE id = ?'
    ).get(abbr) as { id: string } | undefined;
    if (abbrCheck) return abbrCheck.id;
  }

  // Step 3: Chapter number — try column first, then provision content
  const chapterMatch = trimmed.match(/^(?:Chapter\s+)?(\d+:\d+)$/i);
  if (chapterMatch) {
    const chapterNum = chapterMatch[1];

    // 3a: Try chapter_number column
    try {
      const chResult = db.prepare(
        "SELECT id FROM legal_documents WHERE chapter_number = ? LIMIT 1"
      ).get(chapterNum) as { id: string } | undefined;
      if (chResult) return chResult.id;
    } catch {
      // column may not exist
    }

    // 3b: Lazy lookup from s1 provision content
    if (!chapterProvisionLookup) {
      chapterProvisionLookup = buildChapterProvisionLookup(db);
    }
    const provisionMatch = chapterProvisionLookup.get(chapterNum);
    if (provisionMatch) return provisionMatch;
  }

  // Step 4: Exact title match (case-insensitive, with year normalization)
  // This prevents "Finance Act" from matching "Agricultural Finance Act".
  const normalized = normalizeActTitle(trimmed);
  const normalizedLower = normalized.toLowerCase();
  {
    const allDocs = db.prepare(
      "SELECT id, title, title_en, short_name FROM legal_documents"
    ).all() as { id: string; title: string; title_en: string | null; short_name: string | null }[];

    // 4a: Exact match on full title
    const exactFull = allDocs.find(d =>
      d.title.toLowerCase() === normalizedLower ||
      d.title_en?.toLowerCase() === normalizedLower ||
      d.short_name?.toLowerCase() === normalizedLower
    );
    if (exactFull) return exactFull.id;

    // 4b: Exact match after stripping trailing year from stored title
    // "Finance Act" matches "Finance Act, 2020" but NOT "Agricultural Finance Act"
    const exactNoYear = allDocs.find(d => {
      const stripped = d.title.replace(/,?\s+\d{4}\s*$/, '').trim();
      return stripped.toLowerCase() === normalizedLower;
    });
    if (exactNoYear) return exactNoYear.id;
  }

  // Step 5: Substring LIKE — pick shortest matching title (closest to user input).
  // "Finance Act" matches both "Finance Act, 2020" and "Agricultural Finance Act";
  // shortest wins → "Finance Act, 2020" (length 20) beats "Agricultural Finance Act" (26).
  {
    const likeRows = db.prepare(
      "SELECT id, title FROM legal_documents WHERE title LIKE ? OR short_name LIKE ? OR title_en LIKE ?"
    ).all(`%${normalized}%`, `%${normalized}%`, `%${normalized}%`) as { id: string; title: string }[];
    if (likeRows.length > 0) {
      likeRows.sort((a, b) => a.title.length - b.title.length);
      return likeRows[0].id;
    }
  }

  // Step 6: Case-insensitive LIKE — shortest match
  {
    const lowerRows = db.prepare(
      "SELECT id, title FROM legal_documents WHERE LOWER(title) LIKE LOWER(?) OR LOWER(short_name) LIKE LOWER(?) OR LOWER(title_en) LIKE LOWER(?)"
    ).all(`%${normalized}%`, `%${normalized}%`, `%${normalized}%`) as { id: string; title: string }[];
    if (lowerRows.length > 0) {
      lowerRows.sort((a, b) => a.title.length - b.title.length);
      return lowerRows[0].id;
    }
  }

  // Step 7: Short-name LIKE (original input, not normalized)
  const shortResult = db.prepare(
    "SELECT id FROM legal_documents WHERE short_name LIKE ? LIMIT 1"
  ).get(`%${trimmed}%`) as { id: string } | undefined;
  if (shortResult) return shortResult.id;

  // Step 8: Punctuation-normalized full scan — shortest match
  {
    const stripped = normalizePunctuation(trimmed);
    const strippedLower = stripped.toLowerCase();
    const allDocs = db.prepare(
      "SELECT id, title, title_en, short_name FROM legal_documents"
    ).all() as { id: string; title: string; title_en: string | null; short_name: string | null }[];

    const matches: { id: string; titleLen: number }[] = [];
    for (const doc of allDocs) {
      const fields = [doc.title, doc.title_en, doc.short_name].filter(Boolean) as string[];
      for (const field of fields) {
        if (normalizePunctuation(field).toLowerCase().includes(strippedLower)) {
          matches.push({ id: doc.id, titleLen: doc.title.length });
          break; // one match per doc is enough
        }
      }
    }
    if (matches.length > 0) {
      matches.sort((a, b) => a.titleLen - b.titleLen);
      return matches[0].id;
    }
  }

  // Step 9: Resolution failed
  return null;
}

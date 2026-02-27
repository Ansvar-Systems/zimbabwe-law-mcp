#!/usr/bin/env tsx
/**
 * Zimbabwe Law MCP — Census Script
 *
 * Enumerates ALL Acts from ZimLII (zimlii.org) by scraping
 * the paginated legislation browse page (~9 pages, ~50 acts per page).
 *
 * Outputs data/census.json in golden standard format.
 *
 * Source: ZimLII (Zimbabwe Legal Information Institute) — zimlii.org
 * License: Free Access (AfricanLII / University of Cape Town)
 *
 * Usage:
 *   npx tsx scripts/census.ts
 *   npx tsx scripts/census.ts --page 3    # Fetch only page 3 (resume)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRateLimit } from './lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZIMLII_BASE = 'https://zimlii.org';
const BROWSE_URL = `${ZIMLII_BASE}/legislation/`;
const CENSUS_PATH = path.resolve(__dirname, '../data/census.json');

/* ---------- Types ---------- */

interface CensusLawEntry {
  id: string;
  title: string;
  identifier: string;
  url: string;
  chapter: string;
  status: 'in_force' | 'amended' | 'repealed';
  category: 'act';
  classification: 'ingestable' | 'excluded' | 'inaccessible';
  ingested: boolean;
  provision_count: number;
  ingestion_date: string | null;
}

interface CensusFile {
  schema_version: string;
  jurisdiction: string;
  jurisdiction_name: string;
  portal: string;
  census_date: string;
  agent: string;
  summary: {
    total_laws: number;
    ingestable: number;
    ocr_needed: number;
    inaccessible: number;
    excluded: number;
  };
  laws: CensusLawEntry[];
}

/* ---------- Helpers ---------- */

function parseArgs(): { page: number | null } {
  const args = process.argv.slice(2);
  let page: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page' && args[i + 1]) {
      page = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return { page };
}

/**
 * Normalise a Zimbabwean Act title into a stable kebab-case ID.
 * E.g. "Cyber and Data Protection Act, 2021" -> "zw-cyber-and-data-protection-act-2021"
 */
function titleToId(title: string): string {
  return 'zw-' + title
    .replace(/['']/g, '')
    .replace(/\[.*?\]/g, '')   // Remove bracketed annotations like [Chapter 12:07]
    .replace(/,/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Parse Act entries from a ZimLII legislation browse page.
 *
 * Each Act appears in a <tr data-document-id="..."> containing
 * a <td class="cell-title"> with an <a href="/akn/zw/act/...">Title</a>
 * and optionally a <td class="cell-citation">Chapter X:Y</td>.
 */
function parseActEntries(html: string): { title: string; urlPath: string; chapter: string }[] {
  const entries: { title: string; urlPath: string; chapter: string }[] = [];
  const seen = new Set<string>();

  // Match rows: <tr ... data-document-id="..."> ... </tr>
  // Then extract the link and citation from each row.
  const rowPattern = /<tr[^>]*data-document-id="[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract the act link
    const linkMatch = rowHtml.match(/<a\s+href="(\/akn\/zw\/act\/[^"]+)">([^<]+)<\/a>/);
    if (!linkMatch) continue;

    const urlPath = linkMatch[1].trim();
    const title = linkMatch[2].trim();

    // Extract chapter citation if present
    const citationMatch = rowHtml.match(/<td\s+class="cell-citation">([^<]*)<\/td>/);
    const chapter = citationMatch ? citationMatch[1].trim() : '';

    // Dedupe by base URL
    const baseUrl = urlPath.replace(/\/eng@[^/]*$/, '');
    if (seen.has(baseUrl)) continue;
    seen.add(baseUrl);

    entries.push({ title, urlPath, chapter });
  }

  return entries;
}

/**
 * Detect total number of pages from ZimLII pagination.
 * Looks for <a class="page-link" href="?page=N"> elements.
 */
function detectTotalPages(html: string): number {
  let maxPage = 1;
  const pagePattern = /page=(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pagePattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > maxPage) maxPage = num;
  }
  return maxPage;
}

/**
 * Load existing census for merge/resume (preserves ingestion data).
 */
function loadExistingCensus(): Map<string, CensusLawEntry> {
  const existing = new Map<string, CensusLawEntry>();
  if (fs.existsSync(CENSUS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf-8')) as CensusFile;
      for (const law of data.laws) {
        if ('ingested' in law && 'url' in law) {
          existing.set(law.id, law);
        }
      }
    } catch {
      // Ignore parse errors, start fresh
    }
  }
  return existing;
}

/* ---------- Main ---------- */

async function main(): Promise<void> {
  const { page: singlePage } = parseArgs();

  console.log('Zimbabwe Law MCP — Census');
  console.log('=========================\n');
  console.log(`  Source: ${ZIMLII_BASE} (Zimbabwe Legal Information Institute)`);
  console.log(`  Browse URL: ${BROWSE_URL}`);
  if (singlePage) console.log(`  Single page mode: page ${singlePage}`);
  console.log();

  const existingEntries = loadExistingCensus();
  if (existingEntries.size > 0) {
    console.log(`  Loaded ${existingEntries.size} existing entries from previous census\n`);
  }

  const allActEntries: { title: string; urlPath: string; chapter: string }[] = [];

  // First, fetch page 1 to detect total pages
  let totalPages: number;
  if (singlePage) {
    totalPages = singlePage;
  } else {
    process.stdout.write('  Detecting total pages...');
    const firstResult = await fetchWithRateLimit(BROWSE_URL);
    if (firstResult.status !== 200) {
      console.error(` ERROR: HTTP ${firstResult.status}`);
      process.exit(1);
    }
    totalPages = detectTotalPages(firstResult.body);
    const firstEntries = parseActEntries(firstResult.body);
    console.log(` ${totalPages} pages found`);
    console.log(`  Page 1/${totalPages}: ${firstEntries.length} acts`);
    allActEntries.push(...firstEntries);
  }

  // Determine remaining pages to fetch
  const startPage = singlePage ? singlePage : 2;
  const endPage = singlePage ? singlePage : totalPages;

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const url = `${BROWSE_URL}?page=${pageNum}`;
    process.stdout.write(`  Fetching page ${pageNum}/${totalPages}...`);

    const result = await fetchWithRateLimit(url);
    if (result.status !== 200) {
      console.log(` ERROR: HTTP ${result.status}`);
      continue;
    }

    const entries = parseActEntries(result.body);
    console.log(` ${entries.length} acts`);
    allActEntries.push(...entries);
  }

  // Deduplicate across pages
  const deduped = new Map<string, { title: string; urlPath: string; chapter: string }>();
  for (const entry of allActEntries) {
    const baseUrl = entry.urlPath.replace(/\/eng@[^/]*$/, '');
    if (!deduped.has(baseUrl)) {
      deduped.set(baseUrl, entry);
    }
  }

  console.log(`\n  Total unique acts found: ${deduped.size}`);

  // Convert to census entries, merging with existing data
  const today = new Date().toISOString().split('T')[0];

  for (const [, { title, urlPath, chapter }] of deduped) {
    const id = titleToId(title);
    const fullUrl = `${ZIMLII_BASE}${urlPath}`;

    // Preserve ingestion data from existing census if available
    const existing = existingEntries.get(id);

    const entry: CensusLawEntry = {
      id,
      title,
      identifier: urlPath.replace(/\/eng@.*$/, '').replace(/^\/akn\/zw\//, ''),
      url: fullUrl,
      chapter: chapter || existing?.chapter || '',
      status: existing?.status ?? 'in_force',
      category: 'act',
      classification: existing?.classification ?? 'ingestable',
      ingested: existing?.ingested ?? false,
      provision_count: existing?.provision_count ?? 0,
      ingestion_date: existing?.ingestion_date ?? null,
    };

    existingEntries.set(id, entry);
  }

  // Build final census
  const allLaws = Array.from(existingEntries.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const ingestable = allLaws.filter(l => l.classification === 'ingestable').length;
  const inaccessible = allLaws.filter(l => l.classification === 'inaccessible').length;
  const excluded = allLaws.filter(l => l.classification === 'excluded').length;

  const census: CensusFile = {
    schema_version: '1.0',
    jurisdiction: 'ZW',
    jurisdiction_name: 'Zimbabwe',
    portal: ZIMLII_BASE,
    census_date: today,
    agent: 'claude-opus-4-6',
    summary: {
      total_laws: allLaws.length,
      ingestable,
      ocr_needed: 0,
      inaccessible,
      excluded,
    },
    laws: allLaws,
  };

  fs.mkdirSync(path.dirname(CENSUS_PATH), { recursive: true });
  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));

  console.log('\n=========================');
  console.log('Census Complete');
  console.log('=========================\n');
  console.log(`  Total acts:     ${allLaws.length}`);
  console.log(`  Ingestable:     ${ingestable}`);
  console.log(`  Inaccessible:   ${inaccessible}`);
  console.log(`  Excluded:       ${excluded}`);
  console.log(`\n  Output: ${CENSUS_PATH}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Zimbabwe Law MCP -- Full Corpus Discovery
 *
 * Scrapes all pages of https://zimlii.org/legislation/ to discover
 * every available Zimbabwean Act on ZimLII.
 *
 * Output: data/census.json with all discovered acts
 *
 * Usage:
 *   npx tsx scripts/discover-acts.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRateLimit } from './lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://zimlii.org/legislation/';
const DATA_DIR = path.resolve(__dirname, '../data');

interface DiscoveredAct {
  id: string;
  title: string;
  url: string;
  year: string;
  number: string;
  type: 'act' | 'ordinance' | 'si' | 'unknown';
  consolidationDate: string;
}

/**
 * Parse a single page of the ZimLII legislation listing.
 * Extracts act titles and AKN URLs from the HTML.
 */
function parseListingPage(html: string): DiscoveredAct[] {
  const acts: DiscoveredAct[] = [];

  // ZimLII listing uses <a href="/akn/zw/act/..."> links with act titles
  // Pattern: <a href="/akn/zw/act/{type?}/{year}/{number}/eng@{date}">Title</a>
  const linkPattern = /<a\s+href="(\/akn\/zw\/act\/(?:[a-z]+\/)?(\d{4})\/(\d+)\/eng@([\d-]+))"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;

  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const [, urlPath, year, number, consolidationDate, rawTitle] = match;
    const title = rawTitle
      .replace(/<[^>]+>/g, '') // strip HTML tags
      .replace(/\s+/g, ' ')   // normalize whitespace
      .trim();

    if (!title) continue;

    // Determine type from URL path
    let type: DiscoveredAct['type'] = 'act';
    if (urlPath.includes('/act/si/')) type = 'si';
    else if (urlPath.includes('/act/ord/')) type = 'ordinance';

    // Generate stable ID from URL path
    const typePrefix = type !== 'act' ? `${type}-` : '';
    const id = `zw-${typePrefix}${year}-${number}`;

    const fullUrl = `https://zimlii.org${urlPath}`;

    acts.push({ id, title, url: fullUrl, year, number, type, consolidationDate });
  }

  return acts;
}

/**
 * Extract total page count from the pagination HTML.
 */
function extractPageCount(html: string): number {
  // Look for pagination links like ?page=9
  const pagePattern = /\?page=(\d+)/g;
  let maxPage = 1;
  let match;
  while ((match = pagePattern.exec(html)) !== null) {
    const page = parseInt(match[1], 10);
    if (page > maxPage) maxPage = page;
  }
  return maxPage;
}

async function main(): Promise<void> {
  console.log('Zimbabwe Law MCP -- Full Corpus Discovery');
  console.log('==========================================\n');
  console.log(`  Source: ZimLII (zimlii.org)`);
  console.log(`  URL: ${BASE_URL}\n`);

  // Fetch first page to determine total pages
  console.log('Fetching page 1...');
  const firstPage = await fetchWithRateLimit(BASE_URL);
  if (firstPage.status !== 200) {
    console.error(`Failed to fetch listing: HTTP ${firstPage.status}`);
    process.exit(1);
  }

  const totalPages = extractPageCount(firstPage.body);
  console.log(`  Found ${totalPages} pages of legislation\n`);

  // Collect all acts across all pages
  const allActs: DiscoveredAct[] = [];
  const seenUrls = new Set<string>();

  // Parse first page
  const page1Acts = parseListingPage(firstPage.body);
  for (const act of page1Acts) {
    if (!seenUrls.has(act.url)) {
      seenUrls.add(act.url);
      allActs.push(act);
    }
  }
  console.log(`  Page 1: ${page1Acts.length} acts found`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const url = `${BASE_URL}?page=${page}`;
    console.log(`Fetching page ${page}...`);
    const result = await fetchWithRateLimit(url);

    if (result.status !== 200) {
      console.error(`  WARNING: Page ${page} returned HTTP ${result.status}`);
      continue;
    }

    const pageActs = parseListingPage(result.body);
    let newCount = 0;
    for (const act of pageActs) {
      if (!seenUrls.has(act.url)) {
        seenUrls.add(act.url);
        allActs.push(act);
        newCount++;
      }
    }
    console.log(`  Page ${page}: ${pageActs.length} acts found (${newCount} new)`);
  }

  // Separate by type
  const acts = allActs.filter(a => a.type === 'act');
  const ordinances = allActs.filter(a => a.type === 'ordinance');
  const sis = allActs.filter(a => a.type === 'si');
  const unknown = allActs.filter(a => a.type === 'unknown');

  console.log(`\n${'='.repeat(60)}`);
  console.log('DISCOVERY REPORT');
  console.log('='.repeat(60));
  console.log(`  Total unique documents: ${allActs.length}`);
  console.log(`  Acts:                   ${acts.length}`);
  console.log(`  Ordinances:             ${ordinances.length}`);
  console.log(`  Statutory Instruments:  ${sis.length}`);
  if (unknown.length > 0) console.log(`  Unknown:                ${unknown.length}`);

  // Build census
  const census = {
    jurisdiction: 'zw',
    jurisdiction_name: 'Zimbabwe',
    source: 'zimlii.org',
    discovered_at: new Date().toISOString().split('T')[0],
    total_documents: allActs.length,
    acts_count: acts.length,
    ordinances_count: ordinances.length,
    si_count: sis.length,
    // Mark all acts + ordinances as ingestable, SIs as excluded for now
    ingestable: acts.length + ordinances.length,
    excluded: sis.length,
    documents: allActs.map(a => ({
      id: a.id,
      title: a.title,
      url: a.url,
      year: a.year,
      number: a.number,
      type: a.type,
      consolidation_date: a.consolidationDate,
      status: a.type === 'si' ? 'excluded' : 'ingestable',
    })),
  };

  // Write census
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const censusPath = path.join(DATA_DIR, 'census.json');
  fs.writeFileSync(censusPath, JSON.stringify(census, null, 2));
  console.log(`\nCensus written to ${censusPath}`);
  console.log(`  ${census.ingestable} ingestable documents`);
  console.log(`  ${census.excluded} excluded (Statutory Instruments)`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

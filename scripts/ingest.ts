#!/usr/bin/env tsx
/**
 * Zimbabwe Law MCP -- Ingestion Pipeline
 *
 * Fetches Zimbabwean legislation from ZimLII (zimlii.org).
 * ZimLII provides free access to Zimbabwean legal information
 * hosted by AfricanLII at the University of Cape Town.
 *
 * Usage:
 *   npm run ingest                    # Full ingestion
 *   npm run ingest -- --limit 5       # Test with 5 acts
 *   npm run ingest -- --skip-fetch    # Reuse cached pages
 *
 * Data is sourced under free access principles; government legislation
 * is public domain under Zimbabwean law.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRateLimit } from './lib/fetcher.js';
import { parseZimLIIHtml, KEY_ZW_ACTS, type ActIndexEntry, type ParsedAct } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SEED_DIR = path.resolve(__dirname, '../data/seed');

function parseArgs(): { limit: number | null; skipFetch: boolean } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let skipFetch = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--skip-fetch') {
      skipFetch = true;
    }
  }

  return { limit, skipFetch };
}

async function fetchAndParseActs(acts: ActIndexEntry[], skipFetch: boolean): Promise<void> {
  console.log(`\nProcessing ${acts.length} Zimbabwean Acts...\n`);

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;
  const results: { id: string; shortName: string; provisions: number; definitions: number; status: string }[] = [];

  for (const act of acts) {
    const sourceFile = path.join(SOURCE_DIR, `${act.id}.html`);
    const seedFile = path.join(SEED_DIR, `${act.id}.json`);

    // Skip if seed already exists and we're in skip-fetch mode
    if (skipFetch && fs.existsSync(seedFile)) {
      const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
      results.push({
        id: act.id,
        shortName: act.shortName,
        provisions: existing.provisions.length,
        definitions: existing.definitions.length,
        status: 'cached',
      });
      totalProvisions += existing.provisions.length;
      totalDefinitions += existing.definitions.length;
      skipped++;
      processed++;
      continue;
    }

    try {
      let html: string;

      if (fs.existsSync(sourceFile) && skipFetch) {
        html = fs.readFileSync(sourceFile, 'utf-8');
      } else {
        process.stdout.write(`  Fetching ${act.shortName} (${act.title})...`);
        const result = await fetchWithRateLimit(act.url);

        if (result.status !== 200) {
          console.log(` HTTP ${result.status}`);
          results.push({ id: act.id, shortName: act.shortName, provisions: 0, definitions: 0, status: `HTTP ${result.status}` });
          failed++;
          processed++;
          continue;
        }

        // Check for 404 soft-fail (page returns 200 but shows "Not found")
        if (result.body.includes('Not found (Error 404)')) {
          console.log(` SOFT 404 (page not found)`);
          results.push({ id: act.id, shortName: act.shortName, provisions: 0, definitions: 0, status: 'soft-404' });
          failed++;
          processed++;
          continue;
        }

        html = result.body;
        fs.writeFileSync(sourceFile, html);
        console.log(` OK (${(html.length / 1024).toFixed(0)} KB)`);
      }

      const parsed = parseZimLIIHtml(html, act);
      fs.writeFileSync(seedFile, JSON.stringify(parsed, null, 2));
      totalProvisions += parsed.provisions.length;
      totalDefinitions += parsed.definitions.length;
      results.push({
        id: act.id,
        shortName: act.shortName,
        provisions: parsed.provisions.length,
        definitions: parsed.definitions.length,
        status: parsed.provisions.length > 0 ? 'OK' : 'WARN: 0 provisions',
      });
      console.log(`    -> ${parsed.provisions.length} provisions, ${parsed.definitions.length} definitions extracted`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR parsing ${act.shortName}: ${msg}`);
      results.push({ id: act.id, shortName: act.shortName, provisions: 0, definitions: 0, status: `ERROR: ${msg.substring(0, 80)}` });
      failed++;
    }

    processed++;
  }

  // Print summary table
  console.log(`\n${'='.repeat(80)}`);
  console.log('INGESTION REPORT');
  console.log('='.repeat(80));
  console.log(`${'Act'.padEnd(12)} ${'Provisions'.padStart(12)} ${'Definitions'.padStart(12)}  Status`);
  console.log('-'.repeat(80));
  for (const r of results) {
    console.log(`${r.shortName.padEnd(12)} ${String(r.provisions).padStart(12)} ${String(r.definitions).padStart(12)}  ${r.status}`);
  }
  console.log('-'.repeat(80));
  console.log(`${'TOTAL'.padEnd(12)} ${String(totalProvisions).padStart(12)} ${String(totalDefinitions).padStart(12)}`);
  console.log(`\nProcessed: ${processed}  |  Skipped (cached): ${skipped}  |  Failed: ${failed}`);
}

async function main(): Promise<void> {
  const { limit, skipFetch } = parseArgs();

  console.log('Zimbabwe Law MCP -- Ingestion Pipeline');
  console.log('======================================\n');
  console.log(`  Source: ZimLII (zimlii.org)`);
  console.log(`  Format: Peachjam/AKN HTML`);
  console.log(`  License: Free Access (AfricanLII)`);

  if (limit) console.log(`  --limit ${limit}`);
  if (skipFetch) console.log(`  --skip-fetch`);

  const acts = limit ? KEY_ZW_ACTS.slice(0, limit) : KEY_ZW_ACTS;
  await fetchAndParseActs(acts, skipFetch);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

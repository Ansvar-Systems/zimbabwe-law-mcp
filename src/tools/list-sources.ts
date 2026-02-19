/**
 * list_sources — Return provenance metadata for all data sources.
 */

import type Database from '@ansvar/mcp-sqlite';
import { readDbMetadata } from '../capabilities.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface SourceInfo {
  name: string;
  authority: string;
  url: string;
  license: string;
  coverage: string;
  languages: string[];
}

export interface ListSourcesResult {
  sources: SourceInfo[];
  database: {
    tier: string;
    schema_version: string;
    built_at?: string;
    document_count: number;
    provision_count: number;
  };
}

function safeCount(db: InstanceType<typeof Database>, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

export async function listSources(
  db: InstanceType<typeof Database>,
): Promise<ToolResponse<ListSourcesResult>> {
  const meta = readDbMetadata(db);

  return {
    results: {
      sources: [
        {
          name: 'Zimbabwe Legal Information Institute (ZimLII)',
          authority: 'ZimLII, hosted by AfricanLII / University of Cape Town',
          url: 'https://zimlii.org',
          license: 'Free Access (AfricanLII)',
          coverage:
            'All Acts of Parliament including Cyber and Data Protection Act (2021), ' +
            'Postal and Telecommunications Act (Chapter 12:05), Access to Information and Protection of Privacy Act (AIPPA), ' +
            'Criminal Law (Codification and Reform) Act (Chapter 9:23), Companies and Other Business Entities Act, ' +
            'Interception of Communications Act, Electronic Transactions Act; ' +
            'Statutory Instruments; selected case law from the Supreme Court, High Court, and Constitutional Court',
          languages: ['en'],
        },
      ],
      database: {
        tier: meta.tier,
        schema_version: meta.schema_version,
        built_at: meta.built_at,
        document_count: safeCount(db, 'SELECT COUNT(*) as count FROM legal_documents'),
        provision_count: safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions'),
      },
    },
    _metadata: generateResponseMetadata(db),
  };
}

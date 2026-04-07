/**
 * Response metadata utilities for Zimbabwe Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
  _citation?: import('./citation.js').CitationMetadata;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let freshness: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) freshness = row.value;
  } catch {
    // Ignore
  }

  return {
    data_source: 'ZimLII (zimlii.org) — Zimbabwe Legal Information Institute, hosted by AfricanLII',
    jurisdiction: 'ZW',
    disclaimer:
      'This data is sourced from ZimLII under free access principles. ' +
      'Government legislation is public domain under Zimbabwean law. ' +
      'Always verify with the official Zimbabwe Government Gazette or Parliament of Zimbabwe portal.',
    freshness,
  };
}
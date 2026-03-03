/**
 * format_citation — Format a Zimbabwean legal citation per standard conventions.
 *
 * Supports Zimbabwean citation styles:
 * - "Section N, Act Title Year"
 * - "s N Act Title"
 * - "Chapter N:NN, Section N"
 */

import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';
import { resolveDocumentId } from '../utils/statute-id.js';
import type Database from '@ansvar/mcp-sqlite';

export interface FormatCitationInput {
  citation: string;
  format?: 'full' | 'short' | 'pinpoint';
}

export interface FormatCitationResult {
  original: string;
  formatted: string;
  format: string;
}

export async function formatCitationTool(
  input: FormatCitationInput,
  db?: InstanceType<typeof Database>,
): Promise<FormatCitationResult> {
  const format = input.format ?? 'full';
  const trimmed = input.citation.trim();

  // "Section N <law>" or "s N <law>"
  const sectionFirst = trimmed.match(/^(?:Section|s\.?)\s+(\d+[A-Za-z]*)\s*[,;]?\s+(.+)$/i);
  // "<law>, Section N" or "<law> Section N"
  const sectionLast = trimmed.match(/^(.+?)[,;]?\s+(?:Section|s\.?)\s+(\d+[A-Za-z]*)$/i);

  const section = sectionFirst?.[1] ?? sectionLast?.[2];
  let law = sectionFirst?.[2] ?? sectionLast?.[1] ?? trimmed;

  // If db available, resolve to canonical title
  if (db && law) {
    const resolvedId = resolveDocumentId(db, law);
    if (resolvedId) {
      const doc = db.prepare('SELECT title FROM legal_documents WHERE id = ?').get(resolvedId) as { title: string } | undefined;
      if (doc) {
        law = doc.title;
      }
    }
  }

  let formatted: string;
  switch (format) {
    case 'short':
      formatted = section ? `s ${section}, ${law.split('(')[0].trim()}` : law;
      break;
    case 'pinpoint':
      formatted = section ? `Section ${section}` : law;
      break;
    case 'full':
    default:
      formatted = section ? `Section ${section}, ${law}` : law;
      break;
  }

  return { original: input.citation, formatted, format };
}

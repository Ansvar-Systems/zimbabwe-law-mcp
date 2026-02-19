/**
 * format_citation — Format a Zimbabwean legal citation per standard conventions.
 *
 * Supports Zimbabwean citation styles:
 * - "Section N, Act Title Year"
 * - "s N Act Title"
 * - "Chapter N:NN, Section N"
 */

import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';
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
): Promise<FormatCitationResult> {
  const format = input.format ?? 'full';
  const trimmed = input.citation.trim();

  // "Section N <law>" or "s N <law>"
  const sectionFirst = trimmed.match(/^(?:Section|s\.?)\s+(\d+[A-Za-z]*)\s*[,;]?\s+(.+)$/i);
  // "<law>, Section N" or "<law> Section N"
  const sectionLast = trimmed.match(/^(.+?)[,;]?\s+(?:Section|s\.?)\s+(\d+[A-Za-z]*)$/i);

  const section = sectionFirst?.[1] ?? sectionLast?.[2];
  const law = sectionFirst?.[2] ?? sectionLast?.[1] ?? trimmed;

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

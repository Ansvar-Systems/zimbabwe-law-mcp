/**
 * validate_citation — Validate a Zimbabwean legal citation against the database.
 *
 * Supports citation formats:
 * - "Section N, [Act Title Year]" (e.g., "Section 29, Cyber and Data Protection Act 2021")
 * - "s N" shorthand (e.g., "s 29 CDPA")
 * - "Chapter N:NN" (e.g., "Chapter 9:23")
 * - "[Act Title], Section N"
 */

import type Database from '@ansvar/mcp-sqlite';
import { resolveDocumentId } from '../utils/statute-id.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface ValidateCitationInput {
  citation: string;
}

export interface ValidateCitationResult {
  valid: boolean;
  citation: string;
  normalized?: string;
  document_id?: string;
  document_title?: string;
  provision_ref?: string;
  status?: string;
  warnings: string[];
}

/**
 * Parse a Zimbabwean legal citation.
 * Supports:
 * - "Section N, Act Title Year" / "Section N Act Title"
 * - "s N Act Title"
 * - "Act Title, Section N" / "Act Title Section N"
 * - "Chapter N:NN"
 * - Just a document reference
 */
function parseCitation(citation: string): { documentRef: string; sectionRef?: string } | null {
  const trimmed = citation.trim();

  // "Section N, Act Title" or "Section N Act Title"
  const sectionFirst = trimmed.match(/^(?:Section|s\.?)\s+(\d+[A-Za-z]*)\s*[,;]?\s+(.+)$/i);
  if (sectionFirst) {
    return { documentRef: sectionFirst[2].trim(), sectionRef: sectionFirst[1] };
  }

  // "Act Title, Section N" or "Act Title Section N"
  const sectionLast = trimmed.match(/^(.+?)[,;]?\s+(?:Section|s\.?)\s+(\d+[A-Za-z]*)$/i);
  if (sectionLast) {
    return { documentRef: sectionLast[1].trim(), sectionRef: sectionLast[2] };
  }

  // "Chapter N:NN, Section N"
  const chapterWithSection = trimmed.match(/^(Chapter\s+\d+:\d+)\s*[,;]?\s*(?:Section|s\.?)\s+(\d+[A-Za-z]*)$/i);
  if (chapterWithSection) {
    return { documentRef: chapterWithSection[1], sectionRef: chapterWithSection[2] };
  }

  // "Chapter N:NN" alone
  const chapterOnly = trimmed.match(/^Chapter\s+(\d+:\d+)$/i);
  if (chapterOnly) {
    return { documentRef: trimmed };
  }

  // Just a document reference
  return { documentRef: trimmed };
}

export async function validateCitationTool(
  db: InstanceType<typeof Database>,
  input: ValidateCitationInput,
): Promise<ToolResponse<ValidateCitationResult>> {
  const warnings: string[] = [];
  const parsed = parseCitation(input.citation);

  if (!parsed) {
    return {
      results: {
        valid: false,
        citation: input.citation,
        warnings: ['Could not parse citation format'],
      },
      _metadata: generateResponseMetadata(db),
    };
  }

  const docId = resolveDocumentId(db, parsed.documentRef);
  if (!docId) {
    return {
      results: {
        valid: false,
        citation: input.citation,
        warnings: [`Document not found: "${parsed.documentRef}"`],
      },
      _metadata: generateResponseMetadata(db),
    };
  }

  const doc = db.prepare(
    'SELECT id, title, status FROM legal_documents WHERE id = ?'
  ).get(docId) as { id: string; title: string; status: string };

  if (doc.status === 'repealed') {
    warnings.push(`WARNING: This statute has been repealed.`);
  } else if (doc.status === 'amended') {
    warnings.push(`Note: This statute has been amended. Verify you are referencing the current version.`);
  }

  if (parsed.sectionRef) {
    const provision = db.prepare(
      "SELECT provision_ref FROM legal_provisions WHERE document_id = ? AND (provision_ref = ? OR provision_ref = ? OR section = ?)"
    ).get(docId, parsed.sectionRef, `s${parsed.sectionRef}`, parsed.sectionRef) as { provision_ref: string } | undefined;

    if (!provision) {
      return {
        results: {
          valid: false,
          citation: input.citation,
          document_id: docId,
          document_title: doc.title,
          warnings: [...warnings, `Provision "${parsed.sectionRef}" not found in ${doc.title}`],
        },
        _metadata: generateResponseMetadata(db),
      };
    }

    return {
      results: {
        valid: true,
        citation: input.citation,
        normalized: `Section ${parsed.sectionRef}, ${doc.title}`,
        document_id: docId,
        document_title: doc.title,
        provision_ref: provision.provision_ref,
        status: doc.status,
        warnings,
      },
      _metadata: generateResponseMetadata(db),
    };
  }

  return {
    results: {
      valid: true,
      citation: input.citation,
      normalized: doc.title,
      document_id: docId,
      document_title: doc.title,
      status: doc.status,
      warnings,
    },
    _metadata: generateResponseMetadata(db),
  };
}

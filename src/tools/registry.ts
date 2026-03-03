/**
 * Tool registry for Zimbabwe Law MCP Server.
 * Shared between stdio (index.ts) and HTTP (api/mcp.ts) entry points.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type Database from '@ansvar/mcp-sqlite';

import { searchLegislation, type SearchLegislationInput } from './search-legislation.js';
import { getProvision, type GetProvisionInput } from './get-provision.js';
import { validateCitationTool, type ValidateCitationInput } from './validate-citation.js';
import { buildLegalStance, type BuildLegalStanceInput } from './build-legal-stance.js';
import { formatCitationTool, type FormatCitationInput } from './format-citation.js';
import { checkCurrency, type CheckCurrencyInput } from './check-currency.js';
import { getEUBasis, type GetEUBasisInput } from './get-eu-basis.js';
import { getZimbabweanImplementations, type GetZimbabweanImplementationsInput } from './get-zimbabwean-implementations.js';
import { searchEUImplementations, type SearchEUImplementationsInput } from './search-eu-implementations.js';
import { getProvisionEUBasis, type GetProvisionEUBasisInput } from './get-provision-eu-basis.js';
import { validateEUCompliance, type ValidateEUComplianceInput } from './validate-eu-compliance.js';
import { listSources } from './list-sources.js';
import { getAbout, type AboutContext } from './about.js';
import { detectCapabilities, upgradeMessage, type Capability } from '../capabilities.js';
export type { AboutContext } from './about.js';

const ABOUT_TOOL: Tool = {
  name: 'about',
  description:
    'Server metadata, dataset statistics, freshness, and provenance. ' +
    'Call this to verify data coverage, currency, and content basis before relying on results.',
  inputSchema: { type: 'object', properties: {} },
};

const LIST_SOURCES_TOOL: Tool = {
  name: 'list_sources',
  description:
    'Returns detailed provenance metadata for all data sources used by this server, ' +
    'including ZimLII (Zimbabwe Legal Information Institute). ' +
    'Use this to understand what data is available, its authority, coverage scope, and known limitations. ' +
    'Also returns dataset statistics (document counts, provision counts) and database build timestamp. ' +
    'Call this FIRST when you need to understand what Zimbabwean legal data this server covers.',
  inputSchema: { type: 'object', properties: {} },
};

export const TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description:
      'Search Zimbabwean statutes and regulations by keyword using full-text search (FTS5 with BM25 ranking). ' +
      'Returns matching provisions with document context, snippets with >>> <<< markers around matched terms, and relevance scores. ' +
      'Supports FTS5 syntax: quoted phrases ("exact match"), boolean operators (AND, OR, NOT), and prefix wildcards (term*). ' +
      'Default limit is 10 results. For broad topics, increase the limit. ' +
      'Do NOT use this for retrieving a known provision -- use get_provision instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query in English. Supports FTS5 syntax: ' +
            '"data protection" for exact phrase, term* for prefix.',
        },
        document_id: {
          type: 'string',
          description: 'Optional: filter results to a specific statute by its document ID.',
        },
        status: {
          type: 'string',
          enum: ['in_force', 'amended', 'repealed'],
          description: 'Optional: filter by legislative status.',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10, max: 50).',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description:
      'Retrieve the full text of a specific provision (section) from a Zimbabwean statute. ' +
      'Specify a document_id (Act title, chapter number, or internal ID) and optionally a section or provision_ref. ' +
      'Omit section/provision_ref to get ALL provisions in the statute (use sparingly -- can be large). ' +
      'Returns provision text, chapter, section number, and metadata. ' +
      'Supports Act title references (e.g., "Cyber and Data Protection Act 2021"), ' +
      'chapter numbers (e.g., "Chapter 9:23"), and short names. ' +
      'Use this when you know WHICH provision you want. For discovery, use search_legislation instead.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description:
            'Statute identifier: Act title (e.g., "Cyber and Data Protection Act 2021"), ' +
            'chapter number (e.g., "Chapter 9:23"), short name, or internal document ID.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "1", "29"). Omit to get all provisions.',
        },
        provision_ref: {
          type: 'string',
          description: 'Direct provision reference (e.g., "s1"). Alternative to section parameter.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'validate_citation',
    description:
      'Validate a Zimbabwean legal citation against the database -- zero-hallucination check. ' +
      'Parses the citation, checks that the document and provision exist, and returns warnings about status ' +
      '(repealed, amended). Use this to verify any citation BEFORE including it in a legal analysis. ' +
      'Supports formats: "Section 29, Cyber and Data Protection Act 2021", "s 29 CDPA", "Chapter 9:23, Section 1".',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to validate. Examples: "Section 29, Cyber and Data Protection Act 2021", "Chapter 9:23".',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description:
      'Build a comprehensive set of citations for a legal question by searching across all Zimbabwean statutes simultaneously. ' +
      'Returns aggregated results from multiple relevant provisions, useful for legal research on a topic. ' +
      'Use this for broad legal questions like "What are the penalties for data breaches in Zimbabwe?" ' +
      'rather than looking up a specific known provision.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Legal question or topic to research (e.g., "data protection", "cybercrime penalties").',
        },
        document_id: {
          type: 'string',
          description: 'Optional: limit search to one statute by document ID.',
        },
        limit: {
          type: 'number',
          description: 'Max results per category (default: 5, max: 20).',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description:
      'Format a Zimbabwean legal citation per standard conventions. ' +
      'Three formats: "full" (formal, e.g., "Section 29, Cyber and Data Protection Act 2021"), ' +
      '"short" (abbreviated), "pinpoint" (section reference only).',
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation string to format.' },
        format: {
          type: 'string',
          enum: ['full', 'short', 'pinpoint'],
          description: 'Output format (default: "full").',
          default: 'full',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description:
      'Check whether a Zimbabwean statute or provision is currently in force, amended, repealed, or not yet in force. ' +
      'Returns the document status, issued date, in-force date, and warnings. ' +
      'Essential before citing any provision -- always verify currency.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (Act title, chapter number, or short name).',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional: provision reference to check a specific section.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_eu_basis',
    description:
      'Get the international/EU legal basis that a Zimbabwean statute aligns with or references. ' +
      'Zimbabwe is not an EU member but several Zimbabwean laws align with international instruments ' +
      '(e.g., CDPA aligns with GDPR, cybercrime provisions with Budapest Convention). ' +
      'Returns document identifiers, reference types, and implementation status.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Zimbabwean statute identifier.' },
        include_articles: {
          type: 'boolean',
          description: 'Include specific article references (default: false).',
          default: false,
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_zimbabwean_implementations',
    description:
      'Find all Zimbabwean statutes that align with or implement a specific EU directive/regulation or international convention. ' +
      'Given an EU/international document ID (e.g., "regulation:2016/679" for GDPR), returns matching Zimbabwean statutes. ' +
      'Note: Zimbabwe implements international standards through domestic legislation, not transposition.',
    inputSchema: {
      type: 'object',
      properties: {
        eu_document_id: {
          type: 'string',
          description: 'EU/international document ID (e.g., "regulation:2016/679" for GDPR).',
        },
        primary_only: {
          type: 'boolean',
          description: 'Return only primary implementing statutes (default: false).',
          default: false,
        },
        in_force_only: {
          type: 'boolean',
          description: 'Return only currently in-force statutes (default: false).',
          default: false,
        },
      },
      required: ['eu_document_id'],
    },
  },
  {
    name: 'search_eu_implementations',
    description:
      'Search for EU directives and regulations that have Zimbabwean implementing/aligning legislation. ' +
      'Search by keyword, type (directive/regulation), or year range.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword search across EU/international document titles.' },
        type: { type: 'string', enum: ['directive', 'regulation'], description: 'Filter by document type.' },
        year_from: { type: 'number', description: 'Filter by year (from).' },
        year_to: { type: 'number', description: 'Filter by year (to).' },
        has_zimbabwean_implementation: {
          type: 'boolean',
          description: 'If true, only return documents with Zimbabwean aligning legislation.',
        },
        limit: { type: 'number', description: 'Max results (default: 20, max: 100).', default: 20 },
      },
    },
  },
  {
    name: 'get_provision_eu_basis',
    description:
      'Get the international/EU legal basis for a SPECIFIC provision within a Zimbabwean statute. ' +
      'More granular than get_eu_basis (which operates at the statute level). ' +
      'Use this for pinpoint international compliance checks at the provision level.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Zimbabwean statute identifier.' },
        provision_ref: { type: 'string', description: 'Provision reference (e.g., "s1" or "1").' },
      },
      required: ['document_id', 'provision_ref'],
    },
  },
  {
    name: 'validate_eu_compliance',
    description:
      'Check international/EU alignment status for a Zimbabwean statute or provision. ' +
      'Detects references to repealed directives, missing alignment status, outdated references. ' +
      'Returns compliance status (compliant, partial, unclear, not_applicable) with warnings.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Zimbabwean statute identifier.' },
        provision_ref: { type: 'string', description: 'Optional: check for a specific provision.' },
        eu_document_id: { type: 'string', description: 'Optional: check against a specific EU/international document.' },
      },
      required: ['document_id'],
    },
  },
];

export function buildTools(
  db?: InstanceType<typeof Database>,
  context?: AboutContext,
  capabilities?: Set<Capability>,
): Tool[] {
  const hasEuRefs = capabilities?.has('eu_references') ?? false;

  const EU_TOOL_NAMES = new Set([
    'get_eu_basis', 'get_zimbabwean_implementations',
    'search_eu_implementations', 'get_provision_eu_basis',
    'validate_eu_compliance',
  ]);

  const tools = TOOLS.filter(t => {
    if (EU_TOOL_NAMES.has(t.name) && !hasEuRefs) return false;
    return true;
  });

  tools.push(LIST_SOURCES_TOOL);

  if (db) {
    try {
      db.prepare('SELECT 1 FROM definitions LIMIT 1').get();
      // Could add a get_definitions tool here when definitions table exists
    } catch {
      // definitions table doesn't exist
    }
  }

  if (context) {
    tools.push(ABOUT_TOOL);
  }

  return tools;
}

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
  context?: AboutContext,
): void {
  const capabilities = detectCapabilities(db);
  const allTools = buildTools(db, context, capabilities);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(db, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(db, args as unknown as GetProvisionInput);
          break;
        case 'validate_citation':
          result = await validateCitationTool(db, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(db, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput, db);
          break;
        case 'check_currency':
          result = await checkCurrency(db, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(db, args as unknown as GetEUBasisInput);
          break;
        case 'get_zimbabwean_implementations':
          result = await getZimbabweanImplementations(db, args as unknown as GetZimbabweanImplementationsInput);
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(db, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(db, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(db, args as unknown as ValidateEUComplianceInput);
          break;
        case 'list_sources':
          result = await listSources(db);
          break;
        case 'about':
          if (context) {
            result = getAbout(db, context);
          } else {
            return {
              content: [{ type: 'text' as const, text: 'About tool not configured.' }],
              isError: true,
            };
          }
          break;
        default:
          return {
            content: [{ type: 'text' as const, text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}

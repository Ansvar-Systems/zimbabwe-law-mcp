/**
 * HTML parser for Zimbabwean legislation from ZimLII (zimlii.org).
 *
 * Parses the Peachjam/AKN HTML structure used by ZimLII into structured seed JSON.
 * ZimLII renders Akoma Ntoso as HTML with CSS classes:
 *   - akn-section: individual sections (e.g. <section class="akn-section" id="part_I__sec_1">)
 *   - akn-part: parts (<div class="akn-part" id="part_I">)
 *   - akn-def: defined terms (<span class="akn-def">)
 *   - Section titles in <h3> tags (e.g. <h3>1. Short title</h3>)
 *   - Section content in <span class="akn-p">, <span class="akn-content">, etc.
 *   - data-eid attributes for element identification
 */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  chapterNumber: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/**
 * Strip HTML tags and decode common entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the chapter/part grouping from a section ID.
 *
 * ZimLII AKN section IDs have various patterns:
 *   "part_I__sec_1"                -> "Part I"
 *   "part_IV__sec_8"               -> "Part IV"
 *   "chp_III__sec_19"              -> "Chapter III"
 *   "chp_II__part_III__sec_12"     -> "Chapter II, Part III"
 *   "chp_VIII__part_I__sec_163"    -> "Chapter VIII, Part I"
 *   "att_1__chp_1__sec_5"          -> "Attachment 1, Chapter 1"
 *   "sec_1"                        -> undefined
 */
function extractChapterFromId(sectionId: string): string | undefined {
  const parts: string[] = [];

  // Check for attachment prefix
  const attMatch = sectionId.match(/att_(\d+)/);
  if (attMatch) parts.push(`Schedule ${attMatch[1]}`);

  // Check for chapter
  const chpMatch = sectionId.match(/chp_([^_]+)/);
  if (chpMatch) parts.push(`Chapter ${chpMatch[1]}`);

  // Check for part
  const partMatch = sectionId.match(/part_([^_]+)/);
  if (partMatch) parts.push(`Part ${partMatch[1]}`);

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Extract the section number from a section ID.
 * e.g. "part_I__sec_1" -> "1"
 *      "sec_3A" -> "3A"
 *      "chp_III__sec_19" -> "19"
 */
function extractSectionNumFromId(sectionId: string): string | undefined {
  const match = sectionId.match(/sec_(\d+[A-Za-z]?)$/);
  return match ? match[1] : undefined;
}

/**
 * Parse ZimLII AKN HTML to extract provisions from a legislation page.
 *
 * Strategy: split on <section class="akn-section"> elements, then extract:
 *   - section ID from the id= attribute
 *   - section title from the <h3> element
 *   - section content from the full text
 *   - definitions from <span class="akn-def"> elements
 */
export function parseZimLIIHtml(html: string, act: ActIndexEntry): ParsedAct {
  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];

  // Track seen section IDs to deduplicate.
  // ZimLII HTML sometimes contains duplicate section elements (e.g. TOC + content).
  // We keep the longest content for each section ID.
  const provisionsById = new Map<string, ParsedProvision>();

  // Extract the main document content area
  // ZimLII wraps AKN content inside a container; sections are direct <section> elements
  const sectionRegex = /<section\s+class="akn-section"\s+id="([^"]+)"[^>]*data-eid="([^"]+)"[^>]*>([\s\S]*?)(?=<section\s+class="akn-section"|<\/div>\s*<\/div>\s*<\/div>|<\/span>\s*<\/div>\s*<\/div>|$)/g;

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionId = match[1];
    const sectionHtml = match[3];

    const sectionNum = extractSectionNumFromId(sectionId);
    if (!sectionNum) continue;

    const part = extractChapterFromId(sectionId);
    const provisionRef = `s${sectionNum}`;

    // Extract title from <h3> tag
    const h3Match = sectionHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    let title = '';
    if (h3Match) {
      title = stripHtml(h3Match[1]);
      // Remove the section number prefix (e.g. "1. Short title" -> "Short title")
      title = title.replace(/^\d+[A-Za-z]?\.\s*/, '');
    }

    // Extract full text content
    const content = stripHtml(sectionHtml);

    if (content.length > 10) {
      const prov: ParsedProvision = {
        provision_ref: provisionRef,
        chapter: part,
        section: sectionNum,
        title,
        content: content.substring(0, 8000), // Cap at 8K chars
      };
      // Deduplicate: keep the version with the longest content
      const existing = provisionsById.get(sectionId);
      if (!existing || content.length > existing.content.length) {
        provisionsById.set(sectionId, prov);
      }
    }

    // Extract definitions from this section (typically in the Interpretation section)
    // ZimLII AKN HTML has definitions in paragraphs like:
    //   <span class="akn-p" data-refersto="#term-child">
    //     "<span class="akn-def">child</span>" means any person under the age of eighteen years;
    //   </span>
    // Some definitions span blockList elements for multi-part definitions.
    const defParaRegex = /<span\s+class="akn-p"\s+data-refersto="#term-([^"]+)"[^>]*>([\s\S]*?)<\/span>(?=\s*<span\s+class="akn-(?:p|blockList)"|$)/g;
    let defMatch: RegExpExecArray | null;
    const seenTerms = new Set<string>();

    while ((defMatch = defParaRegex.exec(sectionHtml)) !== null) {
      const termId = defMatch[1];
      const paraHtml = defMatch[2];

      if (seenTerms.has(termId)) continue;
      seenTerms.add(termId);

      // Extract the term text from <span class="akn-def">
      const termMatch = paraHtml.match(/<span\s+class="akn-def"[^>]*>([^<]+)<\/span>/);
      const termText = termMatch ? stripHtml(termMatch[1]) : '';

      // Extract the definition: everything after the closing </span> of akn-def, stripped of HTML
      const defText = stripHtml(paraHtml);
      // Remove the term and surrounding quotes from the beginning
      let definition = defText
        .replace(new RegExp(`^[""\\s]*${escapeRegex(termText)}[""\\s]*`, 'i'), '')
        .replace(/^[""\u201C\u201D\s]+/, '')
        .replace(/[;.]\s*$/, '')
        .trim();

      if (termText && definition.length > 5) {
        definitions.push({
          term: termText,
          definition: definition.substring(0, 4000),
          source_provision: provisionRef,
        });
      }
    }

    // Also handle blockList-based definitions (e.g. "data controller" with sub-items)
    const blockListDefRegex = /<span\s+class="akn-blockList"\s+data-refersto="#term-([^"]+)"[^>]*>([\s\S]*?)(?=<span\s+class="akn-(?:p|blockList)"\s+data-refersto|$)/g;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = blockListDefRegex.exec(sectionHtml)) !== null) {
      const termId = blockMatch[1];
      const blockHtml = blockMatch[2];

      if (seenTerms.has(termId)) continue;
      seenTerms.add(termId);

      // Extract term from akn-def inside the blockList intro
      const termMatch = blockHtml.match(/<span\s+class="akn-def"[^>]*>([^<]+)<\/span>/);
      const termText = termMatch ? stripHtml(termMatch[1]) : '';

      const defText = stripHtml(blockHtml)
        .replace(new RegExp(`^[""\\s]*${escapeRegex(termText)}[""\\s]*`, 'i'), '')
        .replace(/^[""\u201C\u201D\s]+/, '')
        .replace(/[;.]\s*$/, '')
        .trim();

      if (termText && defText.length > 5) {
        definitions.push({
          term: termText,
          definition: defText.substring(0, 4000),
          source_provision: provisionRef,
        });
      }
    }
  }

  // Collect provisions from the dedup map
  for (const prov of provisionsById.values()) {
    provisions.push(prov);
  }

  // If the primary regex didn't capture any sections, try a fallback approach
  if (provisions.length === 0) {
    const fallbackById = new Map<string, ParsedProvision>();
    const fallbackSections = html.split(/<section\s+class="akn-section"/);

    for (let i = 1; i < fallbackSections.length; i++) {
      const section = fallbackSections[i];
      const idMatch = section.match(/id="([^"]+)"/);
      if (!idMatch) continue;

      const sectionId = idMatch[1];
      const sectionNum = extractSectionNumFromId(sectionId);
      if (!sectionNum) continue;

      const part = extractChapterFromId(sectionId);
      const provisionRef = `s${sectionNum}`;

      // Find the closing </section> for this section
      const closeIdx = section.indexOf('</section>');
      const sectionContent = closeIdx >= 0 ? section.substring(0, closeIdx) : section.substring(0, 8000);

      const h3Match = sectionContent.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      let title = '';
      if (h3Match) {
        title = stripHtml(h3Match[1]).replace(/^\d+[A-Za-z]?\.\s*/, '');
      }

      const content = stripHtml(sectionContent);

      if (content.length > 10) {
        const prov: ParsedProvision = {
          provision_ref: provisionRef,
          chapter: part,
          section: sectionNum,
          title,
          content: content.substring(0, 8000),
        };
        const existing = fallbackById.get(sectionId);
        if (!existing || content.length > existing.content.length) {
          fallbackById.set(sectionId, prov);
        }
      }
    }

    for (const prov of fallbackById.values()) {
      provisions.push(prov);
    }
  }

  // Sort provisions by section number for consistent ordering
  provisions.sort((a, b) => {
    const numA = parseInt(a.section, 10);
    const numB = parseInt(b.section, 10);
    if (numA !== numB) return numA - numB;
    return a.section.localeCompare(b.section);
  });

  // Deduplicate definitions
  const uniqueDefs = new Map<string, ParsedDefinition>();
  for (const def of definitions) {
    const key = def.term.toLowerCase();
    const existing = uniqueDefs.get(key);
    if (!existing || def.definition.length > existing.definition.length) {
      uniqueDefs.set(key, def);
    }
  }

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    provisions,
    definitions: Array.from(uniqueDefs.values()),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pre-configured list of key Zimbabwean Acts to ingest.
 *
 * URLs verified against live ZimLII (zimlii.org) as of 2026-02.
 * Pattern: https://zimlii.org/akn/zw/act/{year}/{number}/eng@{consolidation-date}
 *
 * Note: Electronic Transactions Act 2014 is NOT available on ZimLII.
 * AIPPA is listed as repealed on ZimLII.
 */
export const KEY_ZW_ACTS: ActIndexEntry[] = [
  {
    id: 'zw-cyber-data-protection-2021',
    title: 'Cyber and Data Protection Act, 2021',
    titleEn: 'Cyber and Data Protection Act, 2021',
    shortName: 'CDPA',
    chapterNumber: '12:07',
    status: 'in_force',
    issuedDate: '2021-12-03',
    inForceDate: '2022-03-11',
    url: 'https://zimlii.org/akn/zw/act/2021/5/eng@2022-03-11',
  },
  {
    id: 'zw-postal-telecommunications',
    title: 'Postal and Telecommunications Act',
    titleEn: 'Postal and Telecommunications Act',
    shortName: 'PTA',
    chapterNumber: '12:05',
    status: 'in_force',
    issuedDate: '2000-01-01',
    inForceDate: '2000-01-01',
    url: 'https://zimlii.org/akn/zw/act/2000/4/eng@2016-12-31',
  },
  {
    id: 'zw-access-information-privacy',
    title: 'Access to Information and Protection of Privacy Act',
    titleEn: 'Access to Information and Protection of Privacy Act',
    shortName: 'AIPPA',
    chapterNumber: '',
    status: 'repealed',
    issuedDate: '2002-03-15',
    inForceDate: '2002-03-15',
    url: 'https://zimlii.org/akn/zw/act/2002/5/eng@2016-12-31',
  },
  {
    id: 'zw-criminal-law-codification',
    title: 'Criminal Law (Codification and Reform) Act',
    titleEn: 'Criminal Law (Codification and Reform) Act',
    shortName: 'Criminal Code',
    chapterNumber: '9:23',
    status: 'in_force',
    issuedDate: '2004-08-01',
    inForceDate: '2004-08-01',
    url: 'https://zimlii.org/akn/zw/act/2004/23/eng@2022-03-11',
  },
  {
    id: 'zw-companies-business-entities',
    title: 'Companies and Other Business Entities Act, 2019',
    titleEn: 'Companies and Other Business Entities Act, 2019',
    shortName: 'COBEA',
    chapterNumber: '',
    status: 'in_force',
    issuedDate: '2019-11-15',
    inForceDate: '2019-11-15',
    url: 'https://zimlii.org/akn/zw/act/2019/4/eng@2019-11-15',
  },
  {
    id: 'zw-interception-communications-2007',
    title: 'Interception of Communications Act',
    titleEn: 'Interception of Communications Act',
    shortName: 'ICA',
    chapterNumber: '',
    status: 'in_force',
    issuedDate: '2007-08-03',
    inForceDate: '2007-08-03',
    url: 'https://zimlii.org/akn/zw/act/2007/6/eng@2022-03-11',
  },
  {
    id: 'zw-freedom-of-information-2020',
    title: 'Freedom of Information Act, 2020',
    titleEn: 'Freedom of Information Act, 2020',
    shortName: 'FOIA',
    chapterNumber: '',
    status: 'in_force',
    issuedDate: '2020-07-01',
    inForceDate: '2020-07-01',
    url: 'https://zimlii.org/akn/zw/act/2020/1/eng@2020-07-01',
  },
  {
    id: 'zw-broadcasting-services',
    title: 'Broadcasting Services Act',
    titleEn: 'Broadcasting Services Act',
    shortName: 'BSA',
    chapterNumber: '12:06',
    status: 'in_force',
    issuedDate: '2001-04-01',
    inForceDate: '2001-04-01',
    url: 'https://zimlii.org/akn/zw/act/2001/3/eng@2016-12-31',
  },
  {
    id: 'zw-constitution-2013',
    title: 'Constitution of Zimbabwe Amendment (No. 20) Act, 2013',
    titleEn: 'Constitution of Zimbabwe Amendment (No. 20) Act, 2013',
    shortName: 'Constitution',
    chapterNumber: '',
    status: 'in_force',
    issuedDate: '2013-05-22',
    inForceDate: '2013-05-22',
    url: 'https://zimlii.org/akn/zw/act/2013/1/eng@2017-09-07',
  },
  {
    id: 'zw-money-laundering-proceeds-crime',
    title: 'Money Laundering and Proceeds of Crime Act',
    titleEn: 'Money Laundering and Proceeds of Crime Act',
    shortName: 'MLPCA',
    chapterNumber: '',
    status: 'in_force',
    issuedDate: '2013-01-01',
    inForceDate: '2013-01-01',
    url: 'https://zimlii.org/akn/zw/act/2013/4/eng@2025-04-11',
  },
];

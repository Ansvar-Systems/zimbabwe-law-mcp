/**
 * Rate-limited HTTP client for ZimLII (zimlii.org)
 *
 * - 500ms minimum delay between requests (be respectful to AfricanLII servers)
 * - User-Agent header identifying the MCP
 * - Handles HTML responses from ZimLII Peachjam/AKN pages
 * - No auth needed (Free Access)
 */

const USER_AGENT = 'Zimbabwe-Law-MCP/1.0 (https://github.com/Ansvar-Systems/zimbabwe-law-mcp; hello@ansvar.ai)';
const MIN_DELAY_MS = 500;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface FetchResult {
  status: number;
  body: string;
  contentType: string;
  finalUrl: string;
}

/**
 * Fetch a URL with rate limiting and proper headers.
 * Retries up to 3 times on 429/5xx errors with exponential backoff.
 */
export async function fetchWithRateLimit(url: string, maxRetries = 3): Promise<FetchResult> {
  await rateLimit();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html, application/xhtml+xml, */*',
      },
      redirect: 'follow',
    });

    if (response.status === 429 || response.status >= 500) {
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.log(`  HTTP ${response.status} for ${url}, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
    }

    const body = await response.text();
    return {
      status: response.status,
      body,
      contentType: response.headers.get('content-type') ?? '',
      finalUrl: response.url,
    };
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Fetch a ZimLII legislation page.
 *
 * ZimLII URL pattern (Peachjam/AKN):
 *   /akn/zw/act/{year}/{number}/eng@{consolidation-date}
 *
 * Examples:
 *   /akn/zw/act/2021/5/eng@2022-03-11   (Cyber and Data Protection Act)
 *   /akn/zw/act/2004/23/eng@2022-03-11  (Criminal Law Codification)
 */
export async function fetchZimLIIPage(url: string): Promise<FetchResult> {
  return fetchWithRateLimit(url);
}

/**
 * Discover legislation URLs from the ZimLII legislation index.
 * ZimLII uses alphabet-based pagination: /legislation/?alphabet=c
 */
export async function fetchLegislationIndex(letter: string): Promise<FetchResult> {
  const url = `https://zimlii.org/legislation/?alphabet=${encodeURIComponent(letter.toLowerCase())}`;
  return fetchWithRateLimit(url);
}

# Zimbabwe Law MCP

[![CI](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@ansvar/zimbabwe-law-mcp)](https://www.npmjs.com/package/@ansvar/zimbabwe-law-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/Ansvar-Systems/zimbabwe-law-mcp)](https://securityscorecards.dev/viewer/?uri=github.com/Ansvar-Systems/zimbabwe-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-eu.ansvar%2Fzimbabwe--law--mcp-green)](https://registry.modelcontextprotocol.io/)

A Model Context Protocol (MCP) server providing full-text search and structured access to Zimbabwean legislation, including the Cyber and Data Protection Act (2021), Postal and Telecommunications Act, AIPPA, Criminal Law Act, Companies Act, and more.

> **Note:** Zimbabwe's Cyber and Data Protection Act (2021) is one of Africa's most comprehensive pieces of legislation in this domain, covering data protection, cybersecurity, e-commerce, and cybercrime in a single act. It established the Postal and Telecommunications Regulatory Authority of Zimbabwe (POTRAZ) as the data protection authority.

## Deployment Tier

**SMALL** -- single tier, bundled database.

Zimbabwe has a relatively small legal corpus compared to larger common-law jurisdictions. All legislation and selected case law fit within a single bundled SQLite database.

| Tier | DB Size | Includes | Transport |
|------|---------|----------|-----------|
| **Bundled (single tier)** | ~60-100 MB | All Acts of Parliament, Statutory Instruments, selected case law | stdio (npm) |

## Data Sources

| Source | Authority | Method | Update Frequency | License | Coverage |
|--------|-----------|--------|-----------------|---------|----------|
| [ZimLII](https://zimlii.org) | ZimLII / AfricanLII | HTML Scrape | Weekly | Free Access | All Acts of Parliament, Statutory Instruments, selected case law |
| [Parliament of Zimbabwe](https://www.parlzim.gov.zw) | Parliament of Zimbabwe | HTML Scrape | On change | Government Public Domain | Bills, enacted Acts, Hansard |
| [Veritas Zimbabwe](https://www.veritaszim.net) | Veritas Zimbabwe | HTML Scrape | Weekly | Free Access (Civil Society) | Government Gazette mirrors, legislative analysis |

> Full provenance metadata: [`sources.yml`](./sources.yml)

## Key Legislation Covered

| Act | Identifier | Domain |
|-----|-----------|--------|
| **Cyber and Data Protection Act** | Act 5 of 2021 | Data protection, cybersecurity, cybercrime, e-commerce |
| **Postal and Telecommunications Act** | Chapter 12:05 | Telecommunications regulation, POTRAZ authority |
| **Access to Information and Protection of Privacy Act (AIPPA)** | Act 5 of 2002 | Access to information, privacy |
| **Criminal Law (Codification and Reform) Act** | Chapter 9:23 | Criminal offences including computer-related crimes |
| **Companies and Other Business Entities Act** | Chapter 24:31 | Corporate governance, company formation |
| **Interception of Communications Act** | Act 6 of 2007 | Lawful interception, communications surveillance |
| **Electronic Transactions Act** | Act 16 of 2004 | Electronic signatures, electronic contracts |

## Quick Start

### Install from npm

```bash
npm install -g @ansvar/zimbabwe-law-mcp
```

### Run via npx (no install)

```bash
npx @ansvar/zimbabwe-law-mcp
```

### Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zimbabwe-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/zimbabwe-law-mcp"]
    }
  }
}
```

### Build from Source

```bash
git clone https://github.com/Ansvar-Systems/zimbabwe-law-mcp.git
cd zimbabwe-law-mcp
npm install
npm run build
npm run build:db      # Build the full database
npm start             # Start the server
```

## Tools

| Tool | Description |
|------|-------------|
| `get_provision` | Retrieve a specific section/article from a Zimbabwean Act by law identifier and article number |
| `search_legislation` | Full-text search across all Zimbabwean legislation |
| `list_acts` | List all available Acts of Parliament in the database |
| `get_act_structure` | Get the table of contents / structure of a specific Act |
| `get_provision_eu_basis` | Cross-reference a Zimbabwean provision with related EU/international instruments (GDPR, Budapest Convention) |

## Contract Tests

This MCP includes 12 golden contract tests covering:

- **Article retrieval** (3 tests): CDPA Section 3, CDPA Section 29, Companies Act Section 1
- **Search** (3 tests): personal data, cybercrime, electronic transaction
- **Citation roundtrip** (2 tests): CDPA citation URL, AIPPA citation
- **Cross-reference** (2 tests): GDPR relationship, Budapest Convention relationship
- **Negative cases** (2 tests): non-existent Act, malformed section number

Run contract tests:

```bash
npm run test:contract
```

## Drift Detection

Golden hashes track 6 stable upstream provisions to detect silent content changes:

- Constitution of Zimbabwe (2013), Section 1
- Cyber and Data Protection Act 2021, Section 2 (definitions)
- Cyber and Data Protection Act 2021, Section 3 (objects)
- AIPPA Section 1
- Criminal Law Act Section 1
- Postal and Telecommunications Act Section 1

Run drift detection:

```bash
npm run drift:detect
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run all tests
npm run test:contract  # Run contract tests only
npm run lint         # Lint source code
npm run drift:detect # Check for upstream changes
```

## Security

See [SECURITY.md](.github/SECURITY.md) for vulnerability disclosure policy.

Report data errors: [Open an issue](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/issues/new?template=data-error.md)

## License

Apache-2.0 -- see [LICENSE](LICENSE).

---

Built by [Ansvar Systems](https://ansvar.eu) -- Cybersecurity compliance through AI-powered legal intelligence.

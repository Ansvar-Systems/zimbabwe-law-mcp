# Zimbabwe Law MCP Server

**The VERITAS Zimbabwe alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fzimbabwe-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/zimbabwe-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/zimbabwe-law-mcp?style=social)](https://github.com/Ansvar-Systems/zimbabwe-law-mcp)
[![CI](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](https://github.com/Ansvar-Systems/zimbabwe-law-mcp)

Query **Zimbabwean legislation** — from the Cyber and Data Protection Act and the Criminal Law (Codification and Reform) Act to the Labour Act, Companies and Other Business Entities Act, and more — directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Zimbabwean legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Zimbabwean legal research is scattered across VERITAS Zimbabwe (veritaszim.net), the Parliament of Zimbabwe (parlzim.gov.zw), the Zimbabwe Law Reports, and government gazette publications. Whether you're:
- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking obligations under the Cyber and Data Protection Act (Chapter 11:22) or the Financial Intelligence Unit Act
- A **legal tech developer** building tools on Zimbabwean law
- A **researcher** tracing legislative changes through Acts and amendments

...you shouldn't need a dozen browser tabs and manual PDF cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes Zimbabwean law **searchable, cross-referenceable, and AI-readable**.

> **Initial release:** The Zimbabwe law database is actively being populated from official sources (VERITAS Zimbabwe, parlzim.gov.zw, and the Government Gazette). Coverage will expand with each release. See the roadmap below.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version — zero dependencies, nothing to install.

**Endpoint:** `https://zimbabwe-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add zimbabwe-law --transport http https://zimbabwe-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zimbabwe-law": {
      "type": "url",
      "url": "https://zimbabwe-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** — add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "zimbabwe-law": {
      "type": "http",
      "url": "https://zimbabwe-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/zimbabwe-law-mcp
```

**Claude Desktop** — add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "zimbabwe-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/zimbabwe-law-mcp"]
    }
  }
}
```

## Example Queries

Once connected, just ask naturally:

- *"What does the Cyber and Data Protection Act (Chapter 11:22) say about data processing obligations?"*
- *"Find provisions about employment termination in the Labour Act"*
- *"Is the Access to Information and Protection of Privacy Act still in force?"*
- *"Search for company director obligations in the Companies and Other Business Entities Act"*
- *"What does the Criminal Law (Codification and Reform) Act say about cybercrime?"*
- *"Find provisions about banking supervision in the Banking Act"*
- *"Validate the citation 'Cyber and Data Protection Act, s. 15'"*
- *"Build a legal stance on data protection obligations for financial institutions in Zimbabwe"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Acts** | Initial release | Database being populated from VERITAS Zimbabwe / parlzim.gov.zw |
| **Provisions** | In progress | Full-text searchable with FTS5 |
| **Premium: Case law** | 0 (free tier) | Supreme Court and High Court decisions planned |
| **Premium: Preparatory works** | 0 (free tier) | Hansard and parliamentary reports planned |
| **Premium: Agency guidance** | 0 (free tier) | POTRAZ, RBZ, and ZIMRA guidance planned |
| **Database Size** | Growing | Optimized SQLite, portable |
| **Daily Updates** | Automated | Freshness checks against official sources |

**Verified data only** — every citation is validated against official sources (VERITAS Zimbabwe, parlzim.gov.zw). Zero LLM-generated content.

---

## Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from VERITAS Zimbabwe (veritaszim.net) and the Parliament of Zimbabwe (parlzim.gov.zw)
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing — the database contains regulation text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by Act + section number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
VERITAS Zimbabwe / parlzim.gov.zw → Parse → SQLite → FTS5 snippet() → MCP response
                                      ↑                      ↑
                               Provision parser        Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search VERITAS by Act name | Search by plain English: *"data processing consent"* |
| Navigate multi-chapter statutes manually | Get the exact provision with context |
| Manual cross-referencing between Acts | `build_legal_stance` aggregates across sources |
| "Is this Act still in force?" → check manually | `check_currency` tool → answer in seconds |
| Find SADC or AU convention alignment → dig through treaty databases | `get_eu_basis` → linked international instruments instantly |
| No API, no integration | MCP protocol → AI-native |

**Traditional:** Search VERITAS → Download PDF → Ctrl+F → Cross-reference Zimbabwe Law Reports → Check gazette → Repeat

**This MCP:** *"What are the data protection obligations for telecommunications operators under Zimbabwean law?"* → Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across provisions with BM25 ranking. Supports quoted phrases, boolean operators, prefix wildcards |
| `get_provision` | Retrieve specific provision by Act name + section number |
| `check_currency` | Check if an Act is in force, amended, or repealed |
| `validate_citation` | Validate citation against database — zero-hallucination check. Supports "Cyber and Data Protection Act, s. 15" |
| `build_legal_stance` | Aggregate citations from multiple Acts for a legal topic |
| `format_citation` | Format citations per Zimbabwean conventions (full/short/pinpoint) |
| `list_sources` | List all available Acts with metadata, coverage scope, and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### International Law Alignment Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get international instruments (SADC, AU, UN) that a Zimbabwean statute aligns with |
| `get_zimbabwean_implementations` | Find Zimbabwean laws corresponding to a specific international instrument |
| `search_eu_implementations` | Search international instruments with Zimbabwean implementation counts |
| `get_provision_eu_basis` | Get international law references for a specific provision |
| `validate_eu_compliance` | Check alignment of Zimbabwean statutes against international frameworks |

---

## International Law Alignment

Zimbabwe is not an EU member state. The international law alignment tools cover Zimbabwe's participation in regional and multilateral frameworks:

- **SADC (Southern African Development Community)** — Zimbabwe is a founding member. SADC Model Law on Data Protection informs the Cyber and Data Protection Act.
- **African Union (AU)** — AU Convention on Cyber Security and Personal Data Protection (Malabo Convention). Zimbabwe is a signatory.
- **Commonwealth** — Common law tradition and shared jurisprudential heritage with UK, South Africa, and other Commonwealth jurisdictions.
- **UNCITRAL** — Electronic commerce and arbitration frameworks reflected in Zimbabwe's Electronic Transactions and Electronic Commerce Act.

> **Note:** International cross-references reflect alignment and treaty obligations, not EU transposition. The alignment tools help identify where Zimbabwean and international instruments address similar domains.

---

## Data Sources & Freshness

All content is sourced from authoritative Zimbabwean legal databases:

- **[VERITAS Zimbabwe](https://www.veritaszim.net/)** — Zimbabwe legislation and parliamentary monitoring
- **[Parliament of Zimbabwe](https://www.parlzim.gov.zw/)** — Official Acts of Parliament
- **[Government Gazette](https://www.zimstat.co.zw/)** — Statutory instruments and proclamations

### Data Provenance

| Field | Value |
|-------|-------|
| **Authority** | Parliament of Zimbabwe / Government Printer |
| **Retrieval method** | VERITAS Zimbabwe and parlzim.gov.zw |
| **Language** | English (official language of legislation) |
| **License** | Public domain (government publications) |
| **Coverage** | Initial release — major Acts being ingested |

### Automated Freshness Checks (Daily)

A [daily GitHub Actions workflow](.github/workflows/check-updates.yml) monitors data sources:

| Check | Method |
|-------|--------|
| **Act amendments** | Date comparison against known versions |
| **New Acts** | Parliament of Zimbabwe publication monitoring |
| **Statutory instruments** | Government Gazette monitoring |

**Verified data only** — every citation is validated against official sources. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from VERITAS Zimbabwe and the Parliament of Zimbabwe. However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Initial release — law database is being populated.** Do not rely on this tool as an exhaustive source until coverage is complete
> - **Court case coverage is not included** in the free tier — do not rely solely on this for case law research
> - **Verify critical citations** against primary sources (Parliament of Zimbabwe, Government Gazette) for court filings
> - **Statutory instruments** may not be fully covered in this release

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [SECURITY.md](SECURITY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment. Consult the **Law Society of Zimbabwe** guidance on technology use in legal practice.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/zimbabwe-law-mcp
cd zimbabwe-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run start                                     # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest           # Ingest Acts from VERITAS Zimbabwe / parlzim.gov.zw
npm run build:db         # Rebuild SQLite database
npm run drift:detect     # Run drift detection against anchors
npm run check-updates    # Check for source updates
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** Optimized SQLite (growing)
- **Reliability:** 100% ingestion success rate

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** — MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** — GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### @ansvar/zimbabwe-law-mcp (This Project)
**Query Zimbabwean legislation directly from Claude** — Cyber and Data Protection Act, Labour Act, Companies Act, and more. Full provision text with international law cross-references. `npx @ansvar/zimbabwe-law-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** — HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npx @ansvar/us-regulations-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** — ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

**70+ national law MCPs** covering Botswana, Ghana, Kenya, Namibia, Nigeria, South Africa, Tanzania, Uganda, Zambia, and more African jurisdictions.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Full Acts of Parliament ingestion
- Supreme Court and High Court case law
- Statutory instruments coverage
- SADC and AU treaty alignment mappings
- Historical Act versions and amendment tracking

---

## Roadmap

- [x] Core MCP server architecture with FTS5 search
- [x] International law alignment tools (SADC, AU, Commonwealth)
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [ ] Full Acts of Parliament ingestion (all current Acts)
- [ ] Supreme Court and High Court case law
- [ ] Statutory instruments coverage
- [ ] SADC Protocol and AU Convention alignment
- [ ] Historical versions and amendment tracking
- [ ] Zimbabwean Law Reports indexing

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{zimbabwe_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Zimbabwe Law MCP Server: AI-Powered Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/zimbabwe-law-mcp},
  note = {Zimbabwean legislation database with international law cross-references}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Acts of Parliament:** Parliament of Zimbabwe / Government Printer (public domain)
- **International Law Metadata:** Public domain treaty texts

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server is part of our Sub-Saharan African coverage — ensuring that legal research is accessible across the full African continent alongside our European and global fleet.

So we're open-sourcing it. Navigating Zimbabwe's legislative corpus shouldn't require a law degree.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>

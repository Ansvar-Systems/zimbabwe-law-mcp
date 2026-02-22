# Privacy & Client Confidentiality

**IMPORTANT READING FOR LEGAL PROFESSIONALS**

This document addresses privacy and confidentiality considerations when using this Tool, with particular attention to professional obligations under Law Society of Zimbabwe rules and the Cyber and Data Protection Act.

---

## Executive Summary

**Key Risks:**
- Queries through Claude API flow via Anthropic cloud infrastructure
- Query content may reveal client matters and privileged information
- Law Society of Zimbabwe rules require strict confidentiality under legal professional privilege

**Safe Use Options:**
1. **General Legal Research**: Use Tool for non-client-specific queries
2. **Local npm Package**: Install `@ansvar/zimbabwe-law-mcp` locally — database queries stay on your machine
3. **Remote Endpoint**: Vercel Streamable HTTP endpoint — queries transit Vercel infrastructure
4. **On-Premise Deployment**: Self-host with local LLM for privileged matters

---

## Data Flows and Infrastructure

### MCP (Model Context Protocol) Architecture

This Tool uses the **Model Context Protocol (MCP)** to communicate with AI clients:

```
User Query -> MCP Client (Claude Desktop/Cursor/API) -> Anthropic Cloud -> MCP Server -> Database
```

### Deployment Options

#### 1. Local npm Package (Most Private)

```bash
npx @ansvar/zimbabwe-law-mcp
```

- Database is local SQLite file on your machine
- No data transmitted to external servers (except to AI client for LLM processing)
- Full control over data at rest

#### 2. Remote Endpoint (Vercel)

```
Endpoint: https://zimbabwe-law-mcp.vercel.app/mcp
```

- Queries transit Vercel infrastructure
- Tool responses return through the same path
- Subject to Vercel's privacy policy

### What Gets Transmitted

When you use this Tool through an AI client:

- **Query Text**: Your search queries and tool parameters
- **Tool Responses**: Statute text, provision content, search results
- **Metadata**: Timestamps, request identifiers

**What Does NOT Get Transmitted:**
- Files on your computer
- Your full conversation history (depends on AI client configuration)

---

## Professional Obligations (Zimbabwe)

### Law Society of Zimbabwe Rules

Zimbabwean legal practitioners are bound by strict confidentiality rules under the Legal Practitioners Act [Chapter 27:07], the Legal Practitioners (Professional Conduct and Etiquette) Rules, and the common law duty of confidentiality.

#### Legal Professional Privilege

- All client communications are privileged under legal professional privilege
- Client identity may be confidential in sensitive matters
- Case strategy and legal analysis are protected
- Information that could identify clients or matters must be safeguarded
- Breach of privilege may result in disciplinary proceedings before the Law Society and potential civil liability

### Cyber and Data Protection Act (2021)

Under the **Cyber and Data Protection Act (2021)**, when using services that process client data:

- You are the **Data Controller**
- AI service providers (Anthropic, Vercel) may be **Data Processors**
- A **Data Processing Agreement** may be required
- The **Postal and Telecommunications Regulatory Authority of Zimbabwe (POTRAZ)** oversees data protection compliance through the Cyber Security Centre
- Cross-border data transfers require authorization and adequate safeguards
- Ensure adequate technical and organizational measures are in place

---

## Risk Assessment by Use Case

### LOW RISK: General Legal Research

**Safe to use through any deployment:**

```
Example: "What does the Companies and Other Business Entities Act say about director duties?"
```

- No client identity involved
- No case-specific facts
- Publicly available legal information

### MEDIUM RISK: Anonymized Queries

**Use with caution:**

```
Example: "What are the penalties for money laundering under the Money Laundering and Proceeds of Crime Act?"
```

- Query pattern may reveal you are working on a money laundering matter
- Anthropic/Vercel logs may link queries to your API key

### HIGH RISK: Client-Specific Queries

**DO NOT USE through cloud AI services:**

- Remove ALL identifying details
- Use the local npm package with a self-hosted LLM
- Or use professional legal resources (Veritas, Zimbabwe Law Reports) with proper data handling agreements

---

## Data Collection by This Tool

### What This Tool Collects

**Nothing.** This Tool:

- Does NOT log queries
- Does NOT store user data
- Does NOT track usage
- Does NOT use analytics
- Does NOT set cookies

The database is read-only. No user data is written to disk.

### What Third Parties May Collect

- **Anthropic** (if using Claude): Subject to [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy)
- **Vercel** (if using remote endpoint): Subject to [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)

---

## Recommendations

### For Solo Practitioners / Small Firms

1. Use local npm package for maximum privacy
2. General research: Cloud AI is acceptable for non-client queries
3. Client matters: Use professional legal resources (Veritas, Zimbabwe Law Reports)

### For Large Firms / Corporate Legal

1. Negotiate data processing agreements with AI service providers
2. Consider on-premise deployment with self-hosted LLM
3. Train staff on safe vs. unsafe query patterns
4. Ensure compliance with Cyber and Data Protection Act cross-border transfer requirements

### For Government / Public Sector

1. Use self-hosted deployment, no external APIs
2. Follow Government of Zimbabwe information security requirements
3. Air-gapped option available for classified matters

---

## Questions and Support

- **Privacy Questions**: Open issue on [GitHub](https://github.com/Ansvar-Systems/zimbabwe-law-mcp/issues)
- **Anthropic Privacy**: Contact privacy@anthropic.com
- **Law Society Guidance**: Consult Law Society of Zimbabwe ethics guidance
- **Data Protection Authority**: POTRAZ Cyber Security Centre (potraz.gov.zw)

---

**Last Updated**: 2026-02-22
**Tool Version**: 1.0.0

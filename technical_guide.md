# EDGAR Answer Engine – Technical Guide (Vercel)

**Purpose** Build a cloud-hosted web app (Next.js on Vercel) that can answer **any natural-language query** about SEC EDGAR filings—covering **all form types**—with **evidence-grounded citations** to the original filings, without mirroring EDGAR.

**Design Principles**

- **Accuracy first.** Every statement must be supported by retrieved evidence from the filing or an official SEC dataset.
- **No EDGAR mirroring.** Fetch on demand; cache minimally with short TTL.
- **Tool-first orchestration.** Use an LLM only to plan and compose; all facts come from tools.
- **Progressive results.** Stream partial results for broad scans; finalize once verification is done.
- **Compliance & respect.** Identify with a descriptive `User-Agent`, honor rate limits, and backoff.

---

## 1) High-Level Architecture

```
Browser (Next.js App Router)
  └─ Chat UI (Vercel AI SDK)  ⇄  /api/chat (tool-calling)
                                  │
                                  ├─ Query Router & Plan Builder
                                  │    ├─ Entity & scope resolver (ticker/name→CIK, dates, forms)
                                  │    ├─ Query classification (metadata / content / hybrid / numeric)
                                  │    └─ Retrieval plan (which tools, order, filters)
                                  │
                                  ├─ Retrieval Layer (three lanes)
                                  │    1) Official structured APIs (submissions, XBRL)
                                  │    2) Index enumerate + fetch & scan (official-only)
                                  │    3) Optional full‑text discovery (third‑party) → always verify via 2)
                                  │
                                  ├─ Parser + Sectionizer (per‑form adapters)
                                  │
                                  ├─ Evidence Store (short‑lived): Postgres + pgvector + Blob
                                  │
                                  └─ Answer Composer (RAG + verifier) → Citations

Infra: Vercel (serverless), Neon/Supabase Postgres (pgvector), Upstash Redis/Queues, Vercel Cron
```

**Why this works**

- Orchestration lets you translate any NL prompt into a concrete retrieval plan.
- Evidence comes only from official filings or official EDGAR datasets (optionally located faster via a third‑party index but always re‑verified).
- Sectionizers give precise, readable citations (e.g., *10‑K Item 7 MD&A* paragraph + URL).

---

## 2) Data Sources & Endpoints (you will use)

> These are referenced by the MCP tools and by serverless functions. All calls are server‑side.

**Official SEC endpoints**

- **Submissions (company filing history):** `https://data.sec.gov/submissions/CIK##########.json` (10‑digit CIK with leading zeros)
- **XBRL – Company Facts:** `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`
- **XBRL – Frames:** `https://data.sec.gov/api/xbrl/frames/{taxonomy}/{tag}/{unit}/{period}.json` (e.g., `us-gaap/RevenueFromContractWithCustomerExcludingAssessedTax/USD/CY2023Q4I.json`)
- **Daily / Full Indexes:** `https://www.sec.gov/Archives/edgar/daily-index/` and `https://www.sec.gov/Archives/edgar/full-index/` (use *master.idx*, *form.idx*, *company.idx*, *crawler.idx*)
- **Archives (filing files):** `https://www.sec.gov/Archives/edgar/data/{cik}/{accession-without-dashes}/{primary-document}` + exhibits under the same folder
- **Ticker↔CIK mapping files:** e.g., `https://www.sec.gov/files/company_tickers.json` and `.../company_tickers_exchange.json`

**Third‑party (optional for discovery speed)**

- Full‑text filing search API (e.g., sec-api or equivalent). Use only to **find** candidates; you **must** fetch and quote from the official SEC archive before answering.

**Operational requirements**

- Set a descriptive `User-Agent` containing app name and contact email.
- Rate limit: enforce ≤10 requests/sec globally with jittered backoff; queue long scans.

---

## 3) Repository Layout

```
apps/
  web/ (Next.js, Vercel AI SDK)
    app/
      api/
        chat/route.ts           # Orchestrates tool calls
        filings/[cik]/route.ts  # Submissions API proxy (server-only)
        fetch/route.ts          # Fetch & parse a filing by URL or accession
        search/route.ts         # Broad search (index enumerate + scan)
    lib/
      mcp-client.ts             # MCP client wrapper
      rate-limit.ts             # Upstash Redis limiter
      sec.ts                    # SEC helpers (CIK pad, compose URLs)
      sectionizers/             # Per-form adapters
      rag/                      # Retriever, ranker, answer composer
    components/chat/*

services/
  edgar-mcp/ (Node service)
    src/tools/*.ts              # Tool implementations
    src/server.ts               # MCP server bootstrap

packages/
  types/                        # Shared TS types/schemas

infra/
  vercel.json                   # Vercel config (routes, regions)
  prisma/ or drizzle/           # DB schema & migrations
```

---

## 4) Environment & Dependencies

- **Runtime**: Next.js 14+ (App Router), Node serverless functions (not Edge for parsing/HTML libs).
- **AI**: Vercel AI SDK (tool/function calling). Use a reliable LLM (OpenAI or Claude) with JSON tool outputs.
- **DB**: Neon/Supabase Postgres + `pgvector` for embeddings. ORM: Prisma or Drizzle.
- **Cache/Queues**: Upstash Redis (global rate limiter + background job queue).
- **Storage**: Vercel Blob for transient filing text and attachments.
- **Text/HTML**: `htmlparser2` or `cheerio`, `unified` + `rehype`, `iconv-lite` for encodings.
- **Search**: `@faker-js/bm25` (or custom) for BM25; `@openai/embeddings` (or equivalent) for vector search.
- **Validation**: `zod` for tool input/output schemas.

`USER_AGENT="EdgarAnswerEngine/1.0 ([email protected])"`

---

## 5) Query Orchestration (End‑to‑End)

**5.1 Classification (Router)**

- **Metadata** (e.g., “last 10 filings from NVDA”).
- **Content (textual)** (e.g., “goodwill triggering event but no impairment in MD&A”).
- **Hybrid** (metadata filter → text search; e.g., “all 8‑K corrections on revenue recognition in last 6 months”).
- **Numeric/XBRL** (e.g., “Compare Q/Q revenue revisions across last 4 10‑Qs for AAPL”).

**5.2 Plan Builder** Extract from the prompt:

- **Entity**: ticker/name → resolve to **CIK**.
- **Scope**: dates, window (e.g., 6 months), forms (all by default, can down‑select), keywords/topics.
- **Sections**: MD&A, Risk Factors, Notes, Item numbers, Exhibits.
- **Outputs**: fields required (quotes, tables, metrics), citation granularity.

**5.3 Retrieval lanes (choose 1 or combine)**

1. **Structured APIs** (fast, authoritative): submissions history, XBRL facts/frames.
2. **Index enumerate → fetch & scan** (official‑only): build candidate list via *master.idx*/*crawler.idx*, fetch filings, parse, sectionize, and search.
3. **Optional full‑text discoverer**: run a cross‑corpus query for recall, then **verify** officially (lane 2).

**5.4 Evidence assembly**

- Parse HTML/TXT to plain text; **sectionize** by form.
- Chunk text (e.g., 1–2k chars, overlapping 200 chars); compute embeddings; store with TTL.
- **Hybrid rank**: keyword/BM25 + vector similarity + section priors (e.g., MD&A for certain topics).
- Select **top‑k** spans with char ranges; store for citations.

**5.5 Answer composition**

- The LLM receives **only** retrieved snippets + structured metadata; writes the answer and attaches citations.
- If evidence is insufficient, return **“no evidence found”** and suggest broadened filters.

---

## 6) MCP Server (Your Tool Layer)

Implement a small Node/TypeScript MCP server exposing tools. This isolates SEC logic from the chat app and gives you a clean, testable boundary.

**6.1 Tool surface (minimal contract)**

```ts
// All inputs/outputs validated with zod; all responses include timing + source URLs
resolve_company({ query: string }): { cik: string, name: string, tickers: string[] }

list_filings({ cik: string, since?: string, until?: string, forms?: string[] }): Array<{
  accession: string,
  form: string,
  filedAt: string,
  primaryUrl: string
}>

fetch_filing({ accession?: string, url?: string }): { html: string, baseUrl: string, exhibits: string[] }

extract_sections({ form: string, html: string }): Record<string, { text: string }>

search_text({ html?: string, text?: string, query: string, sections?: string[] }): Array<{
  section: string,
  score: number,
  start: number,
  end: number,
  snippet: string
}>

xbrl_facts({ cik: string, concept?: string, period?: { start?: string, end?: string } }): any
```

**6.2 Implementation notes**

- **Rate limit** every SEC fetch; attach `User-Agent`.
- **Retries** with exponential backoff; treat 429/503 as retryable.
- **Content types**: filings can be HTML, plain text, PDF, or inline XBRL. Prefer HTML/TXT; for PDF, OCR is out of scope for MVP.
- **Exhibit handling**: fetch EX‑99/EX‑10 when needed; keep within rate limits.
- **Observability**: log each tool call (inputs, timings, URLs, bytes, hits).

---

## 7) Per‑Form Sectionizers (precision citations)

**Goal**: Normalize heterogeneous filings into predictable section labels for search/ranking and citations.

**Core adapters**

- **10‑K / 10‑Q / 20‑F / 40‑F**: detect Items by regex and headings (e.g., `Item\s+7\.?\s+Management’s Discussion and Analysis`, `Item\s+1A\.?\s+Risk Factors`, `Item\s+2\.?\s+MD&A` in 10‑Q). Normalize to `MD&A`, `Risk Factors`, `Liquidity`, `Critical Accounting Estimates`, `Business`, `Notes`.
- **8‑K**: map **Items** (e.g., `4.02 Non‑Reliance on Previously Issued Financial Statements`) and extract corresponding narrative blocks.
- **Registration (S‑1/F‑1, S‑3, S‑4)**: headings for `Prospectus Summary`, `Risk Factors`, `Use of Proceeds`, `MD&A` (if present).
- **Foreign Issuers (6‑K)**: sectionize by H1/H2 headings; label generically.
- **Ownership (3/4/5)** and **13F**: treat as structured tables with minimal text; expose as `Tables` + `Notes`.
- **Everything else**: generic heading-based segmentation with safe fallbacks.

**Implementation**

- Parse HTML with Cheerio; strip boilerplate, navigation, and footers.
- Build a library of **regexes + heading synonyms** per form; keep it data-driven (JSON rules per form).
- Store: `sections(filing_id, label, text_hash, storage_url)`.

---

## 8) Retrieval & Ranking

1. **Candidate selection**
   - Metadata filters (CIK, date range, form types) from submissions/indexes.
   - Optional full‑text discoverer for speed; deduplicate by accession.
2. **Section priors** based on the query (e.g., MD&A for goodwill/impairment; Notes for revenue recognition; 8‑K Item 4.02 for non‑reliance).
3. **Hybrid scoring**
   - BM25 over text windows.
   - Embedding similarity (cosine) with domain‑tuned prompts when creating embeddings.
   - Boost exact phrases/synonyms (`“triggering event”`, `“no impairment”`, `“not impaired”`).
4. **Top‑k span extraction**
   - Return 2–6 highest‑scoring spans with char ranges and section labels.
5. **Answer composer**
   - The LLM sees only these spans + metadata; it **must quote** at least one span per claim and emit citations (URL + section/offset).

---

## 9) Accuracy Controls (make it hard to be wrong)

- **Two‑step verification**: if candidates came from a third‑party index, **always fetch from SEC**; compare text hashes.
- **Contradiction check**: simple classifier over selected spans; if spans disagree, ask user to refine or present both views.
- **Numeric cross‑check**: when a claim includes figures, fetch Company Facts/Frames and compare values/periods.
- **Answer policy**: refuse to speculate; if no evidence within scope, say so and suggest how to broaden/narrow.
- **Citations policy**: every paragraph with a claim includes at least one filing URL citation. For tables, include a citation per row group.

---

## 10) Data Model (Postgres + pgvector)

**companies**

- `cik (pk, text)`
- `name (text)`
- `tickers (text[])`
- `last_refreshed (timestamptz)`

**filings**

- `id (serial pk)`
- `cik (text)`
- `accession (text unique)`
- `form (text)`
- `filed_at (date)`
- `primary_url (text)`
- `hash (text)`

**sections**

- `id (serial pk)`
- `filing_id (int)`
- `label (text)`
- `text_url (text)`   // Blob path
- `text_hash (text)`
- `char_count (int)`

**chunks**

- `id (serial pk)`
- `section_id (int)`
- `start (int)`
- `end (int)`
- `embedding (vector)`

**answers**

- `id (serial pk)`
- `prompt (text)`
- `plan (jsonb)`
- `citations (jsonb)` // {url, section, start, end}
- `created_at (timestamptz)`

**TTL policy**: 30–90 days on sections/chunks via cron cleanup; keep only IDs and hashes for deduplication.

---

## 11) App API Surface (serverless)

- `POST /api/chat` → `{ messages[] }` → streams JSONLines events with `role: tool|assistant`, citations attached.
- `GET /api/filings/[cik]?limit=10` → last N via submissions.
- `POST /api/fetch` → `{ accession|url }` → `{ html, baseUrl }`.
- `POST /api/search` → `{ cik|forms|dateRange|query }` → paged results (progress events).

**Rate‑limit middleware** applied to all routes; backoff + queue if saturated.

---

## 12) Implementation Steps (for a junior developer)

**Step 0 — Bootstrap**

1. Create a Next.js app (App Router) on Vercel. Enable Serverless Functions (Node runtime).
2. Create a Neon/Supabase Postgres; enable `pgvector`.
3. Create an Upstash Redis database (global).
4. Set env vars: `DATABASE_URL`, `REDIS_URL`, `USER_AGENT`, `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`).

**Step 1 — Company resolution & submissions**

1. Implement `resolve_company` in MCP:
   - Load SEC mapping JSON(s) into Postgres (via cron) and query by ticker/name.
2. Implement `list_filings`:
   - Call `data.sec.gov/submissions/CIK##########.json` server‑side with `User-Agent`.
   - Parse the `filings.recent` block; map to `{accession, form, filedAt, primaryUrl}`.
3. Add `/api/filings/[cik]` route to return last N filings.

**Acceptance test**: “What are the last 10 filings from NVDA?” returns a 10‑row table with form, date, accession, SEC URL.

**Step 2 — Fetch & parse filings (official‑only)**

1. Implement `fetch_filing`:
   - Compose the archive URL from `cik` + `accession` + `primaryDocument` (from submissions) or accept a direct URL.
   - Fetch HTML/TXT; store a copy in Blob (short TTL); return `html`.
2. Implement base **generic sectionizer** (headings, H1/H2, bold patterns).
3. Build **10‑K/10‑Q adapters** (MD&A, Risk Factors, Liquidity, etc.).
4. Build **8‑K adapter** (Item numbers → labels).

**Acceptance test**: “Find an MD&A example with a goodwill ‘triggering event’ but no impairment” returns quoted MD&A paragraph + link.

**Step 3 — Search & ranking**

1. Implement `search_text` (BM25 over sections; simple tokenizer; return spans with offsets).
2. Add embeddings for re‑ranking top 200 spans; store in `chunks`.
3. In `/api/search`, chain: enumerate candidates (indexes or submissions windows) → fetch+sectionize → search → stream matches.

**Acceptance test**: “Show all filings in the last 6 months that contained corrections on revenue recognition” yields a list where each row shows the matched sentence, form, company, filed date, and a link.

**Step 4 — Answer composer & citations**

1. Build a **system prompt** that:
   - Forces quoting of spans with `[start:end]` offsets and requires a URL per paragraph.
   - Disallows claims without evidence.
2. Implement a post‑processor that converts offsets to anchor links (when available) or shows section + approximate paragraph count.

**Acceptance test**: For each returned claim/table row, there is at least one filing URL.

**Step 5 — XBRL numeric verification (optional but recommended)**

1. Implement `xbrl_facts` with frames/companyfacts.
2. For numeric prompts, compare narrative values to XBRL; if mismatch, flag the discrepancy in the answer.

**Step 6 — Optional full‑text discovery**

1. Add a third‑party full‑text API client (`searchAllFilings`).
2. Use only to obtain accessions; immediately refetch the official filing and re‑run sectionizers/search.
3. Gate behind a feature flag and per‑request opt‑in.

---

## 13) Prompt Contracts (LLM)

**Router system prompt**

- Classify into metadata / content / hybrid / numeric.
- Extract: entities, CIK, date ranges, forms, sections, keywords.
- Produce a **plan JSON** with ordered tool calls.

**Answer system prompt**

- You may only use retrieved snippets & structured data.
- Quote exact text for every claim with citation.
- If evidence is insufficient, say so and suggest adjustments.

**Safety prompt**

- No legal advice; present facts and sources only.

---

## 14) Observability & Ops

- **Structured logs** for each tool call: `{tool, inputs, status, ms, bytes, url}`.
- **Traces** across `/api/chat` → MCP tools → parser; include correlation IDs.
- **Metrics**: hit rate, latency p95, recall\@k, answerable% without third‑party.
- **Vercel Cron**
  - Refresh mapping files daily.
  - Purge blobs older than TTL.
  - Rebuild embeddings for hot companies daily.

---

## 15) Performance & Limits

- Respect ≤10 req/s. Use a **token bucket** per region; single Redis key with leaky‑bucket algorithm.
- For broad 6‑month searches, stream: show first hits within 3–10 seconds; continue in background.
- Retry with backoff on HTTP 429/503; cap concurrency per company.

---

## 16) Security & Compliance

- All SEC requests are **server‑side**; never expose archive URLs that leak internal tokens (there are none for EDGAR, but keep the pattern).
- Sanitize HTML (no script execution) before parsing; treat filing content as untrusted.
- Do not store PII; logs contain only public URLs and CIK/accessions.

---

## 17) Acceptance Tests (must pass)

1. **Metadata** – “What are the last 10 filings from [ticker]?”
   - Returns 10 rows with form, filed date, accession, and **official** links.
2. **Content** – “Find an example in a company’s MD&A of a ‘triggering event’ for goodwill but **no impairment**.”
   - Returns at least one quoted paragraph from MD&A; includes form, date, URL; highlights the phrase.
3. **Hybrid** – “Show all filings, within the last 6 months, that contained **corrections on revenue recognition**.”
   - Returns a list grouped by company, each with quoted span(s), form, date, and URL; prioritizes 8‑K Item 4.02 and narrative explanations in 10‑K/10‑Q.
4. **Numeric** – “Across the last four 10‑Qs for [company], how did recognized revenue change?”
   - Returns a table sourced from XBRL frames/facts; each row cites the filing period and a link.
5. **Edge cases** – Foreign issuer (20‑F/6‑K), ownership forms (3/4/5), registration statements (S‑1): app still sectionizes and quotes with links.

---

## 18) Future Enhancements

- PDF text extraction + OCR for scanned exhibits.
- Learned re‑ranker fine‑tuned on EDGAR QA pairs.
- Rule‑based detection packs: `Restatement`, `Material Weakness`, `Going Concern`, `Goodwill Triggering Event`, `Non‑GAAP Adjustments`.
- Multi‑company comparative answers with per‑row citations.

---

## 19) Developer Checklist (one sitting per step)

-

---

## 20) Glossary

- **CIK**: Central Index Key (10 digits) used by EDGAR to identify filers.
- **Accession**: Unique ID per submission (e.g., `0001193125-24-123456`).
- **MD&A**: Management’s Discussion and Analysis.
- **XBRL**: Machine‑readable financials; frames and company facts endpoints provide structured data.
- **Sectionizer**: Code that splits a filing into labeled sections for search and citation.
- **RAG**: Retrieval‑Augmented Generation (retrieve → re‑rank → generate from evidence only).

---

### Appendix A – Sectionizer Patterns (starter set)

**10‑K/10‑Q**

- `Item\s+7\.?\s+Management[’']s\s+Discussion\s+and\s+Analysis` → `MD&A`
- `Item\s+1A\.?\s+Risk\s+Factors` → `Risk Factors`
- `Item\s+7A\.?\s+Quantitative\s+and\s+Qualitative\s+Disclosures\s+About\s+Market\s+Risk` → `Market Risk`
- `Critical\s+Accounting\s+Estimates` → `Critical Accounting Estimates`
- `Liquidity\s+and\s+Capital\s+Resources` → `Liquidity`

**8‑K**

- `Item\s+4\.02` → `Non‑Reliance / Restatement`
- `Item\s+2\.02` → `Results of Operations`
- `Item\s+8\.01` → `Other Events`

**Registrations (S‑1/F‑1)**

- `Prospectus\s+Summary`, `Risk\s+Factors`, `Use\s+of\s+Proceeds`, `Management[’']s\s+Discussion`

(Keep this list in JSON to iterate quickly.)


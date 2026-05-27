# Chewy Customer Service RAG Agent — Project Memory

> This document is the source of truth for all decisions, architecture, and progress on the Chewy Agent project. Update it as things change. Feed it to Claude at the start of any session.

---

## What This Project Is

A RAG-powered customer service agent built on Chewy's actual help center content. Users ask natural language questions about Chewy policies and get accurate answers with links to the source page. Scoped to **policies and help content only** — no fake commerce layer needed.

**Why it exists:** Portfolio project built in public on LinkedIn to demonstrate RAG, Next.js, and AI engineering skills to prospective employers.

---

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Vector DB | Supabase (pgvector) | Hosted, no infra management, free tier sufficient |
| Scraper | Playwright (Python) | Handles JS-rendered pages, good portfolio skill |
| Scrape cadence | Once (cron later as stretch goal) | Policies don't change hourly |
| Embedding model | OpenAI text-embedding-3-small | ~$0.01 for full corpus, stable, no free-tier fragility |
| LLM | Anthropic (Claude) via direct API | Primary LLM for generation |
| Backend | FastAPI | Familiar Python, clean streaming support |
| Frontend | Next.js + Vercel AI SDK | Next.js practice for job search, AI SDK for streaming |
| Deployment | Vercel (frontend) + Railway or Render (FastAPI) | TBD |
| Chunking strategy | Section-based on h2/h3 boundaries | Preserves semantic coherence better than fixed token splits |
| Chunk size target | ~400-600 tokens with ~50 token overlap | Balances precision vs context |
| Citation approach | Return chunk URL + page title alongside stream | Render as citation cards in UI |
| Content scope | Help center / policies only | Clean demo story, no fake order data needed |

---

## Architecture

```
Phase 1 — Data Pipeline (Python, runs once)
  Playwright scraper
    → raw_pages table (Supabase)
  BeautifulSoup chunker
    → chunks split on h2/h3 boundaries
  OpenAI embedder (text-embedding-3-small)
    → chunks table with vector(1536) column (Supabase/pgvector)

Phase 2 — Backend (FastAPI)
  POST /api/chat
    → embed user query (text-embedding-3-small)
    → match_chunks() RPC → top 5 similar chunks
    → build prompt with chunks + source URLs
    → stream response from Anthropic API
    → return chunk metadata (citations) alongside stream

Phase 3 — Frontend (Next.js + Vercel AI SDK)
  useChat hook → streaming chat UI
  CitationCard components → source URL + page title per answer
```

---

## Repo Structure

```
chewy-agent/
├── scraper/
│   ├── scrape.py          # Playwright crawler → raw_pages
│   ├── chunk.py           # HTML → clean chunks
│   ├── embed.py           # Chunks → embeddings → Supabase
│   ├── requirements.txt
│   └── .env
│
├── backend/
│   ├── main.py            # FastAPI app, /api/chat endpoint
│   ├── retrieval.py       # Query embedding + similarity search
│   ├── prompt.py          # System prompt + context assembly
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── api/chat/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── CitationCard.tsx
│   ├── lib/
│   │   └── types.ts
│   └── .env.local
│
└── README.md
```

---

## Supabase Schema

### `raw_pages`
```sql
create table raw_pages (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  title text,
  raw_html text,
  scraped_at timestamptz default now()
);
```

### `chunks`
```sql
create table chunks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  heading text,
  url text not null,
  page_title text,
  token_count int,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

### `match_chunks` function
```sql
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  text text,
  heading text,
  url text,
  page_title text,
  similarity float
)
language sql stable
as $$
  select
    id, text, heading, url, page_title,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

## Environment Variables

### scraper/.env
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

### backend/.env
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### frontend/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:8000  # dev
# NEXT_PUBLIC_API_URL=https://your-railway-url  # prod
```

---

## Build Order

- [x] Supabase setup (tables, pgvector, match_chunks function)
- [ ] Scraper — `scrape.py` (Playwright → raw_pages)
- [ ] Chunker — `chunk.py` (raw HTML → clean chunks)
- [ ] Embedder — `embed.py` (chunks → vectors → Supabase)
- [ ] FastAPI retrieval endpoint (non-streaming, verify chunks are returned correctly)
- [ ] FastAPI streaming chat endpoint
- [ ] Next.js project setup
- [ ] Chat UI with Vercel AI SDK (`useChat`)
- [ ] Citation cards
- [ ] Deploy (Vercel + Railway/Render)

---

## Key Concepts (for reference)

**RAG (Retrieval-Augmented Generation):** Instead of giving the LLM everything, embed the user's query, find the most semantically similar chunks in the database, and inject only those into the prompt. Keeps context focused and responses grounded in real source material.

**Embeddings:** A model converts text into a vector (array of ~1536 numbers). Similar meaning = similar numbers. The embedding model is run on both the corpus (at indexing time) and the user query (at query time) — same model both times is critical.

**Cosine similarity:** The math used to compare two vectors. Returns a value 0-1, where 1 = identical meaning. pgvector's `<=>` operator computes cosine distance (1 - similarity), so ordering by `<=>` ascending gives you the most similar chunks first.

**Chunking:** Breaking pages into focused segments before embedding. Large chunks = blurry vectors = imprecise retrieval. Section-based chunking (split on h2/h3) is preferred over fixed token splits because it respects the content's natural structure.

**Overlap:** The last ~50 tokens of one chunk are repeated at the start of the next. Prevents context loss at boundaries.

**StreamData (Vercel AI SDK):** Mechanism for attaching metadata (citation chunks) to a streaming response so the frontend can render citation cards alongside the streamed text.

---

## LinkedIn Content Arc

| Week | Post |
|---|---|
| 1 | "I'm building a RAG agent on real data — here's what RAG actually means" + architecture diagram |
| 2 | Scraper running — screenshot of raw Chewy data populating Supabase |
| 3 | Chunking decisions — why section-based beats fixed token counts |
| 4 | "What does an embedding actually look like?" — show the vector, explain cosine similarity |
| 5 | First retrieval working — query → similar chunks → screenshot |
| 6 | Streaming response with citations — short video |
| 7 | Full polished demo video + lessons learned |

---

## Stretch Goals (post-MVP)

- Weekly re-scrape via GitHub Actions cron
- Query rewriting (expand terse queries before embedding)
- Reranking (retrieve top 20, rerank to top 5 with a cross-encoder)
- Conversation memory (multi-turn context)
- Thumbs up/down feedback per answer
- Chewy-adjacent branding and polish

---

## Open Questions

- Railway vs Render for FastAPI hosting — decide at deploy time
- Whether to proxy Anthropic calls through Next.js API routes or hit FastAPI directly from the frontend

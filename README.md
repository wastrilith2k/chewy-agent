# Chewy Assistant

A RAG-powered customer service chatbot trained on Chewy's public help center. Ask it anything about orders, Autoship, returns, prescriptions, or health services — it retrieves the relevant sections and answers using only that content.

**[Live demo →](https://chewy-agent.vercel.app)**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js · Tailwind CSS · Vercel AI SDK v6 |
| LLM | Google Gemini 2.0 Flash via OpenRouter |
| Vector store | Pinecone (serverless, us-east-1) |
| Embeddings | `multilingual-e5-large` · 1024-dim · cosine |
| Ingest | TypeScript · tsx · Pinecone Inference API |
| Deploy | Vercel |

## Project structure

```
chewy-agent/
├── data/          # 23 scraped help center pages (.txt)
├── ingest/        # One-shot script: chunk → embed → upsert to Pinecone
└── web/           # Next.js app (chat UI + /api/chat route)
```

## How it works

1. **Ingest** — `ingest/ingest.ts` reads the text files, splits them into section-level chunks, embeds via the Pinecone Inference API, and upserts 94 vectors into the `chewy-kb` index.

2. **Query** — on each message, the API route embeds the user's question, retrieves the top-8 chunks by cosine similarity, and passes all of them to Gemini inside an XML-wrapped system prompt. The top-3 unique source URLs are surfaced as citations.

3. **Stream** — the response streams back via Vercel AI SDK's `createUIMessageStream`, with a transient debug payload (query, model, retrieved chunks + scores, full system prompt) captured by the client-side dev panel.

## Running locally

**Prerequisites:** Node 20+, a [Pinecone](https://pinecone.io) account, and an [OpenRouter](https://openrouter.ai) API key.

### 1. Ingest

```bash
cd ingest
npm install
```

Create `/ingest/.env`:
```
PINECONE_API_KEY=your_key
```

Run once to populate the index:
```bash
npx tsx ingest.ts
```

### 2. Web app

```bash
cd web
npm install
```

Create `/web/.env.local`:
```
PINECONE_API_KEY=your_key
OPENROUTER_API_KEY=your_key
```

```bash
npm run dev
# http://localhost:3000
```

## Deploying to Vercel

Import this repo at [vercel.com/new](https://vercel.com/new), set the **Root Directory** to `web`, and add the two environment variables. Vercel auto-detects Next.js.

## Data pipeline note

Chewy's help center is JavaScript-rendered and couldn't be scraped with a standard Playwright setup. The pages were captured with **Cowork**, a browser-based extraction tool — a pragmatic workaround specific to this project. In a production system you'd pull directly from an internal knowledge base or CRM and run the same ingest pipeline on a schedule.

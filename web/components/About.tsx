export function About() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">About this project</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            A RAG-powered customer service assistant trained on Chewy&apos;s public help center.
            Ask it anything about orders, Autoship, returns, prescriptions, or health services — it
            retrieves the relevant sections and answers using only that content.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Stack</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Frontend", "Next.js 16 · Tailwind CSS · Vercel AI SDK v6"],
              ["LLM", "Google Gemini 2.0 Flash via OpenRouter"],
              ["Vector store", "Pinecone (serverless, us-east-1)"],
              ["Embeddings", "multilingual-e5-large · 1024-dim · cosine"],
              ["Ingest", "TypeScript · tsx · Pinecone Inference API"],
              ["Deploy", "Vercel"],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                <p className="text-gray-800 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
            Data pipeline
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Chewy&apos;s help center is heavily JavaScript-rendered, so a standard Playwright scraper
            couldn&apos;t extract the content. Instead, the pages were captured using{" "}
            <strong className="text-gray-800">Cowork</strong>, a browser-based extraction tool — a
            pragmatic workaround specific to this project.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            In a production system you wouldn&apos;t scrape at all. You&apos;d pull directly from an
            internal knowledge base or CRM, embed it with the same pipeline, and upsert to Pinecone
            on a schedule. The ingest script here does exactly that — it&apos;s already structured
            to be swapped to any data source.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
            What changed along the way
          </h3>
          <ol className="space-y-3 text-sm text-gray-600">
            {[
              [
                "Switched vector store",
                "Originally planned Supabase pgvector. Moved to Pinecone for the free-tier Inference API, which means embeddings happen inside Pinecone — no separate embedding model to call.",
              ],
              [
                "Fixed Pinecone SDK breaking changes",
                "The latest SDK changed inference.embed() to a single-object API, and serverless indexes don't support metadata-filtered deletes. Both broke on first run and were fixed by reading the type definitions.",
              ],
              [
                "Source deduplication",
                "Initial version showed up to 5 citation links, including duplicate pages and borderline matches. Now retrieves 8 chunks for context but only surfaces the top 3 unique URLs as citations.",
              ],
              [
                "XML prompt + history cap",
                "Plain-text context caused the model to bleed information across turns — e.g., mentioning prescriptions when asked about cat toys. Wrapping context in <knowledge_base> tags and limiting history to the last 6 messages fixed this.",
              ],
              [
                "Dev panel",
                "Added a collapsible debug panel showing the query, model, full system prompt, and all retrieved chunks with similarity scores — useful for diagnosing retrieval quality.",
              ],
            ].map(([title, desc], i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{title}</p>
                  <p className="mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
            Knowledge base
          </h3>
          <p className="text-sm text-gray-600">
            23 help center pages · 94 section-level chunks · topics include orders, Autoship,
            returns, shipping, account management, prescriptions, and health services.
          </p>
        </div>

      </div>
    </div>
  );
}

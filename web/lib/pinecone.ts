import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index("chewy-kb");

const EMBED_MODEL = "multilingual-e5-large";
const FETCH_K = 8;
const MAX_SOURCES = 3;

export interface Source {
  id: string;
  url: string;
  title: string;
  heading: string;
  score: number;
}

export interface KBResult {
  context: string;
  sources: Source[];
  allMatches: Array<{ id: string; score: number; title: string; url: string; shown: boolean }>;
}

/**
 * Queries the Pinecone knowledge base for chunks relevant to the given query.
 * Embeds the query via the Pinecone Inference API, retrieves the top FETCH_K
 * chunks by cosine similarity, then deduplicates by URL and returns:
 *  - context: all retrieved chunk texts joined for the LLM system prompt
 *  - sources: top MAX_SOURCES unique-URL citations to show the user
 *  - allMatches: every retrieved chunk annotated with a `shown` flag for the dev panel
 */
export async function queryKnowledgeBase(query: string): Promise<KBResult> {
  const result = await pc.inference.embed({
    model: EMBED_MODEL,
    inputs: [query],
    parameters: { inputType: "query", truncate: "END" },
  });

  if (!result.data.length) throw new Error("Pinecone returned no embeddings");
  const emb = result.data[0];
  if (emb.vectorType !== "dense") throw new Error("Unexpected vector type");

  const queryResult = await index.query({
    vector: emb.values,
    topK: FETCH_K,
    includeMetadata: true,
  });

  // Deduplicate by URL, keeping the best score per unique page
  const byUrl = new Map<string, typeof queryResult.matches[0]>();
  for (const match of queryResult.matches) {
    const url = String(match.metadata?.url ?? "");
    if (!url) continue;
    const existing = byUrl.get(url);
    if (!existing || (match.score ?? 0) > (existing.score ?? 0)) {
      byUrl.set(url, match);
    }
  }

  // Sort deduplicated pages by score, take top MAX_SOURCES
  const deduped = [...byUrl.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const topSources = deduped.slice(0, MAX_SOURCES);
  const shownUrls = new Set(topSources.map((m) => String(m.metadata?.url ?? "")));

  const sources: Source[] = topSources.map((m) => ({
    id: m.id,
    url: String(m.metadata?.url ?? ""),
    title: String(m.metadata?.page_title ?? ""),
    heading: String(m.metadata?.heading ?? ""),
    score: m.score ?? 0,
  }));

  // All retrieved matches for dev panel
  const allMatches = queryResult.matches.map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    title: String(m.metadata?.page_title ?? m.id),
    url: String(m.metadata?.url ?? ""),
    shown: shownUrls.has(String(m.metadata?.url ?? "")),
  }));

  const context = queryResult.matches
    .map((m) => m.metadata?.text)
    .filter(Boolean)
    .join("\n\n---\n\n");

  return { context, sources, allMatches };
}

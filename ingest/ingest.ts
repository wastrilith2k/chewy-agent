import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "dotenv";
import { readdirSync, readFileSync } from "fs";
import { resolve, join, basename, extname } from "path";

config({ path: resolve(__dirname, "../.env") });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const DATA_DIR = resolve(__dirname, "../data");
const INDEX_NAME = "chewy-kb";
const EMBED_MODEL = "multilingual-e5-large";
const EMBED_DIM = 1024;
const BATCH_SIZE = 96;
const SEPARATOR_RE = /\n={10,}\n/g;

const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

interface Chunk {
  id: string;
  text: string;
  heading: string;
  url: string;
  page_title: string;
}

async function getOrCreateIndex() {
  const { indexes } = await pc.listIndexes();
  const exists = indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!exists) {
    console.log(`Creating index '${INDEX_NAME}'...`);
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: EMBED_DIM,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      waitUntilReady: true,
    });
    console.log("Index ready.");
  }

  return pc.index(INDEX_NAME);
}

function parseFile(filePath: string): Chunk[] {
  const text = readFileSync(filePath, "utf-8");
  const lines = text.split("\n").slice(0, 5);

  let url = "";
  let title = "";
  for (const line of lines) {
    if (line.startsWith("URL: ")) url = line.slice(5).trim();
    else if (line.startsWith("Title: ")) title = line.slice(7).trim();
  }

  if (!url) {
    console.warn(`  WARNING: no URL found in ${basename(filePath)}, skipping`);
    return [];
  }

  const stem = basename(filePath, extname(filePath)).toLowerCase();
  const sections = text.split(SEPARATOR_RE);
  const chunks: Chunk[] = [];

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    let heading = "";
    let content = section;

    if (section.startsWith("##")) {
      const newline = section.indexOf("\n");
      heading = section.slice(0, newline).replace(/^#+\s*/, "").trim();
      content = section.slice(newline + 1).trim();
    }

    if (!content) continue;

    chunks.push({ id: `${stem}_${i}`, text: content, heading, url, page_title: title });
  }

  return chunks;
}

async function embedAndUpsert(index: ReturnType<typeof pc.index>, chunks: Chunk[]) {
  const texts = chunks.map((c) => c.text);
  const { data: embeddings } = await pc.inference.embed(EMBED_MODEL, texts, {
    inputType: "passage",
    truncate: "END",
  });

  const vectors = chunks.map((chunk, i) => {
    const emb = embeddings[i];
    if (emb.vectorType !== "dense") throw new Error(`Unexpected vector type: ${emb.vectorType}`);
    return {
      id: chunk.id,
      values: emb.values,
      metadata: {
        text: chunk.text,
        heading: chunk.heading,
        url: chunk.url,
        page_title: chunk.page_title,
      },
    };
  });

  await index.upsert(vectors);
}

async function main() {
  const files = readdirSync(DATA_DIR).filter((f) =>
    f.match(/\.(txt|TXT)$/)
  );

  if (files.length === 0) {
    console.error(`No .txt files found in ${DATA_DIR}`);
    process.exit(1);
  }

  const allChunks: Chunk[] = [];
  for (const file of files.sort()) {
    console.log(`Parsing ${file}...`);
    const chunks = parseFile(join(DATA_DIR, file));
    console.log(`  → ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);

  const index = await getOrCreateIndex();

  const ids = allChunks.map((c) => c.id);
  console.log(`Deleting ${ids.length} existing vectors by ID...`);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    try {
      await index.deleteMany(ids.slice(i, i + BATCH_SIZE));
    } catch (e: any) {
      if (e?.name !== "PineconeNotFoundError") throw e;
    }
  }

  console.log("Embedding and upserting...");
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    await embedAndUpsert(index, batch);
    console.log(`  ${i + batch.length}/${allChunks.length} chunks upserted`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

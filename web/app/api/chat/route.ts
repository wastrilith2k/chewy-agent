import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { queryKnowledgeBase } from "@/lib/pinecone";
import { buildSystemPrompt } from "@/lib/prompt";
import type { AppUIMessage } from "@/lib/types";

const MODEL = "google/gemini-2.0-flash-001";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

/**
 * POST /api/chat
 * Accepts a Vercel AI SDK message array, extracts the latest user query,
 * retrieves relevant knowledge base chunks from Pinecone, then streams back:
 *  1. A transient debug payload (query, model, retrieved chunks, system prompt)
 *  2. Source citation parts for each unique URL surfaced to the user
 *  3. The streamed LLM response from Gemini via OpenRouter
 */
export async function POST(req: Request) {
  const { messages } = await req.json();

  const lastUserMessage = messages.findLast((m: { role: string }) => m.role === "user");

  const queryText =
    lastUserMessage?.parts?.find((p: { type: string }) => p.type === "text")
      ?.text ?? lastUserMessage?.content ?? "";

  const { context, sources, allMatches } = await queryKnowledgeBase(queryText);


  const systemPrompt = buildSystemPrompt(context);

  const stream = createUIMessageStream<AppUIMessage>({
    execute: async ({ writer }) => {
      // Send debug info (transient — captured via onData, not stored in message history)
      writer.write({
        type: "data-debug",
        data: {
          query: queryText,
          model: MODEL,
          systemPrompt,
          matches: allMatches,
        },
        transient: true,
      });

      // Stream source citations
      for (const source of sources) {
        writer.write({
          type: "source-url",
          sourceId: source.id,
          url: source.url,
          title: source.heading ? `${source.title} — ${source.heading}` : source.title,
        });
      }

      const result = streamText({
        model: openrouter(MODEL),
        system: systemPrompt,
        messages: await convertToModelMessages(messages.slice(-6)),
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

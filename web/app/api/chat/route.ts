import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { queryKnowledgeBase } from "@/lib/pinecone";
import type { AppUIMessage } from "@/lib/types";

const MODEL = "google/gemini-2.0-flash-001";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const lastUserMessage = messages.findLast((m: { role: string }) => m.role === "user");

  const queryText =
    lastUserMessage?.parts?.find((p: { type: string }) => p.type === "text")
      ?.text ?? lastUserMessage?.content ?? "";

  const { context, sources, allMatches } = await queryKnowledgeBase(queryText);

  const systemPrompt = `You are a helpful Chewy customer service assistant.
Answer using ONLY the information in <knowledge_base> below.
Do not use your training knowledge, do not infer from product catalogs, and do not draw on anything from earlier in the conversation that isn't supported by the knowledge base.
If the answer is not in the knowledge base, say so clearly and briefly — do not guess or fabricate.
Be concise and friendly.

<knowledge_base>
${context}
</knowledge_base>`;

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

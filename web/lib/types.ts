import type { UIMessage } from "ai";

export type DebugInfo = {
  query: string;
  model: string;
  systemPrompt: string;
  matches: Array<{ id: string; score: number; title: string; url: string; shown: boolean }>;
};

export type AppUIMessage = UIMessage<
  never,
  { debug: DebugInfo }
>;

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Message } from "./Message";
import type { AppUIMessage, DebugInfo } from "@/lib/types";

const SUGGESTED_QUESTIONS = [
  "How do I set up Autoship?",
  "What is Chewy's return policy?",
  "How do I track my order?",
  "What is Connect with a Vet?",
];

function DevPanel({ debug }: { debug: DebugInfo | null }) {
  const [open, setOpen] = useState(false);

  if (!debug) return null;

  return (
    <div className="border-t border-gray-200 bg-gray-50 text-xs font-mono">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <span className="font-sans font-medium">Dev Panel</span>
        <span>{open ? "▼" : "▲"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-96 overflow-y-auto">
          <div>
            <p className="text-gray-400 uppercase tracking-wide mb-1">Query</p>
            <p className="text-gray-800">{debug.query}</p>
          </div>

          <div>
            <p className="text-gray-400 uppercase tracking-wide mb-1">Model</p>
            <p className="text-gray-800">{debug.model}</p>
          </div>

          <div>
            <p className="text-gray-400 uppercase tracking-wide mb-1">
              Retrieved chunks ({debug.matches.length})
            </p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400">
                  <th className="pr-3 pb-1">score</th>
                  <th className="pr-3 pb-1">cited</th>
                  <th className="pb-1">page · chunk</th>
                </tr>
              </thead>
              <tbody>
                {debug.matches.map((m) => (
                  <tr key={m.id} className={m.shown ? "text-gray-800" : "text-gray-400"}>
                    <td className="pr-3 py-0.5">{m.score.toFixed(3)}</td>
                    <td className="pr-3">{m.shown ? "✓" : "—"}</td>
                    <td className="truncate max-w-xs">
                      {m.title || m.id}
                      <span className="text-gray-400 ml-1.5">#{m.id.split("_").pop()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-gray-400 uppercase tracking-wide mb-1">System prompt</p>
            <pre className="whitespace-pre-wrap text-gray-700 bg-white border border-gray-200 rounded p-2 max-h-64 overflow-y-auto">
              {debug.systemPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function Chat() {
  const [input, setInput] = useState("");
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat<AppUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onData: (part) => {
      if (part.type === "data-debug") {
        setDebug(part.data);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Show dots while loading and the last message has no text yet
  const lastMsg = messages[messages.length - 1];
  const showDots =
    isLoading &&
    (lastMsg?.role === "user" ||
      (lastMsg?.role === "assistant" &&
        !lastMsg.parts.some((p) => p.type === "text" && (p as { type: "text"; text: string }).text)));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  function handleSuggestion(q: string) {
    if (isLoading) return;
    sendMessage({ text: q });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                Hi! I&apos;m your Chewy assistant 🐾
              </h2>
              <p className="text-sm text-gray-500">
                Ask me anything about orders, Autoship, returns, health services, and more.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestion(q)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <Message key={msg.id} message={msg} />)
        )}

        {showDots && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
              C
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom section: dev panel + input (shrink-0 so messages area absorbs the flex) */}
      <div className="shrink-0">
        <DevPanel debug={debug} />

        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about Chewy..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Send
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-2">
            Powered by Chewy help center knowledge base
          </p>
        </div>
      </div>
    </div>
  );
}

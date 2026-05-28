"use client";

import type { UIMessage } from "ai";

interface Props {
  message: UIMessage;
}

/**
 * Renders a single chat message bubble.
 * User messages appear right-aligned in orange; assistant messages appear
 * left-aligned in white with source citation chips below the text.
 * Returns null for assistant messages with no text yet to avoid an empty
 * bubble flash at stream startup.
 */
export function Message({ message }: Props) {
  const isUser = message.role === "user";

  const textParts = message.parts.filter((p) => p.type === "text");
  const sourceParts = message.parts.filter((p) => p.type === "source-url");

  // Don't render an empty assistant bubble while streaming hasn't produced text yet
  if (message.role === "assistant" && textParts.length === 0) return null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          isUser ? "bg-orange-500 text-white" : "bg-blue-600 text-white"
        }`}
      >
        {isUser ? "U" : "C"}
      </div>

      <div className={`flex flex-col gap-2 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-orange-500 text-white rounded-tr-sm"
              : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
          }`}
        >
          {textParts.map((part, i) =>
            part.type === "text" ? (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : null
          )}
        </div>

        {sourceParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sourceParts.map((part, i) =>
              part.type === "source-url" ? (
                <a
                  key={i}
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
                >
                  <span className="opacity-60">↗</span>
                  {part.title ?? new URL(part.url).pathname.split("/").pop()}
                </a>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Chat } from "@/components/Chat";
import { About } from "@/components/About";

type Tab = "assistant" | "about";

/**
 * Root page. Renders a tabbed layout switching between the chat assistant
 * and the about/portfolio page.
 */
export default function Page() {
  const [tab, setTab] = useState<Tab>("assistant");

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Chewy Assistant</span>
            {tab === "assistant" && (
              <span className="text-xs text-green-600 font-medium">● Online</span>
            )}
          </div>

          {/* Tabs */}
          <nav className="flex gap-1">
            {(["assistant", "about"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col">
        {tab === "assistant" ? <Chat /> : <About />}
      </div>
    </main>
  );
}

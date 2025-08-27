"use client";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "היי! תשאל/י כל דבר על ההסכם ואני אענה מבוסס המסמך. 📄" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, history: [] }),
      });

      // קוראים את הגוף פעם אחת בלבד
      const raw = await r.text();

      if (!r.ok) {
        // מנסים לפרש שגיאה כ-JSON מאותו raw (בלי לקרוא שוב)
        let msg = raw;
        try {
          const j = JSON.parse(raw);
          msg = j?.error || raw;
        } catch { /* raw נשאר טקסט */ }
        setMessages((prev) => [...prev, { role: "assistant", content: `שגיאה מהשרת: ${msg}` }]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: raw || "—" }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `שגיאת רשת: ${e?.message || e}` }]);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <main className="min-h-dvh p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Legal RAG Assistant</h1>
          <div className="text-sm opacity-70">Israel–UAE BIT • 2020</div>
        </header>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="p-4 md:p-6 space-y-4 max-h-[60dvh] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                  ${m.role === "user"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 p-3 md:p-4 dark:border-neutral-800">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="שאל/י כל דבר על ההסכם…"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none
                           focus:ring-2 focus:ring-neutral-700 dark:border-neutral-700 dark:bg-neutral-950"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="rounded-xl px-4 text-sm font-medium shadow-sm transition
                           disabled:opacity-50 disabled:cursor-not-allowed
                           bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {busy ? "טוען…" : "שלח"}
              </button>
            </div>
            <p className="mt-2 text-xs opacity-70">Enter לשליחה, Shift+Enter לשורה חדשה</p>
          </div>
        </div>
      </div>
    </main>
  );
}

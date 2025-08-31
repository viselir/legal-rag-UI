"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

const SUGGESTIONS = [
  "מה שם ההסכם?",
  "מה הכותרת של Section A?",
  "מה מטרת ההסכם בקיצור?",
  "אילו חריגים מופיעים בהסכם?",
];

function splitAnswer(raw: string) {
  // מנקה רעשי REPL/כותרות
  const t = (raw || "")
    .trim()
    .replace(/^RAG REPL.*\n?/i, "")
    .replace(/^Type your prompt.*\n?/i, "")
    .replace(/^Type your question.*\n?/i, "")
    .replace(/^\s*>\s*$/gm, "")
    .trim();

  const ANSWER = "=== Answer ===";
  const SOURCES = "=== Sources ===";

  let answer = t;
  const sIdx = t.indexOf(SOURCES);
  const aIdx = t.indexOf(ANSWER);

  if (aIdx !== -1 && sIdx !== -1) {
    const inner = t.slice(aIdx + ANSWER.length, sIdx).trim();
    answer = inner || t.slice(0, sIdx).trim();
  } else if (aIdx !== -1) {
    answer = t.slice(aIdx + ANSWER.length).trim();
  } else if (sIdx !== -1) {
    answer = t.slice(0, sIdx).trim();
  }

  const sources: string[] = [];
  if (sIdx !== -1) {
    const srcText = t.slice(sIdx + SOURCES.length).trim();
    srcText
      .split(/\r?\n/)
      .map((l) => l.replace(/^[\s•*\-–]+/, "").trim())
      .filter(Boolean)
      .forEach((s) => sources.push(s));
  }

  return { answer, sources };
}

function errorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const name = (err as { name?: string }).name;
    const message = (err as { message?: string }).message;
    if (name === "AbortError") return "Backend timeout";
    if (typeof message === "string") return message;
  }
  return String(err);
}

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "היי! תשאל/י כל דבר על ההסכם ואני אענה מבוסס המסמך. 📄" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, history: [] }),
        cache: "no-store",
        signal: controller.signal,
      });

      const raw = await r.text();
      if (!r.ok) {
        // מנסה לפרש שגיאה-JSON כדי להחזיר הודעה קריאה
        try {
          const j = JSON.parse(raw) as { error?: unknown; detail?: unknown };
          const msg =
            (typeof j.error === "string" && j.error) ||
            (typeof j.detail === "string" && j.detail) ||
            raw;
          setMessages((prev) => [...prev, { role: "assistant", content: `שגיאה מהשרת: ${msg}` }]);
        } catch {
          setMessages((prev) => [...prev, { role: "assistant", content: `שגיאה מהשרת: ${raw}` }]);
        }
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: raw || "—" }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `שגיאת רשת: ${errorMessage(err)}` },
      ]);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function AssistantBubble({ content }: { content: string }) {
    const { answer, sources } = splitAnswer(content);

    async function copyAll() {
      try {
        await navigator.clipboard.writeText(answer || content);
      } catch {
        // ignore
      }
    }

    return (
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                   bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        dir="auto"
      >
        {answer ? (
          <div className="space-y-2">
            <div className="whitespace-pre-wrap">{answer}</div>

            {sources.length > 0 && (
              <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-1 font-medium opacity-80">מקורות</div>
                <ul className="list-disc ps-5 space-y-1">
                  {sources.map((s, i) => (
                    <li key={i} className="text-[0.85rem]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={copyAll}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs opacity-80 transition hover:opacity-100 dark:border-neutral-600"
                title="העתקה"
              >
                העתק
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 p-4 md:p-6 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-xl border bg-white/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Legal RAG Assistant</h1>
            <div className="text-xs opacity-70">Israel–UAE BIT • 2020</div>
          </div>
          <div className="hidden text-xs md:block opacity-70">{busy ? "מענה..." : "מוכן"}</div>
        </header>

        {/* Chat Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {/* Messages */}
          <div ref={scrollRef} className="p-4 md:p-6 space-y-4 max-h-[62dvh] overflow-y-auto">
            {/* הצעות מהירות – מוצג בתחילת שיחה */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? (
                  <div
                    className="max-w-[85%] rounded-2xl bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-white shadow-sm
                               dark:bg-white dark:text-neutral-900"
                    dir="auto"
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ) : (
                  <AssistantBubble content={m.content} />
                )}
              </div>
            ))}

            {/* בועת טעינה */}
            {busy && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-200">
                  <span className="inline-block animate-pulse">חושב…</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 border-t border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-end gap-2">
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
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="rounded-xl px-4 text-sm font-medium shadow-sm transition
                           disabled:cursor-not-allowed disabled:opacity-50
                           bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {busy ? "טוען…" : "שלח"}
              </button>
            </div>
            <p className="mt-2 text-xs opacity-70">Enter לשליחה, Shift+Enter לשורה חדשה</p>
          </div>
        </div>

        {/* Footer – powered by */}
        <footer className="mt-8 flex items-center justify-center gap-3 text-sm md:text-base text-neutral-600 dark:text-neutral-300">
          <span>
            powered by <strong className="font-semibold text-neutral-800 dark:text-neutral-100">Elad Data</strong>
          </span>
          <Image
            src="https://eladsoft.com/wp-content/uploads/2022/04/Elad-logo-color.png"
            alt="Elad Data logo"
            width={180}
            height={52}
            className="h-6 md:h-8 w-auto"
            priority
          />
        </footer>
      </div>
    </main>
  );
}

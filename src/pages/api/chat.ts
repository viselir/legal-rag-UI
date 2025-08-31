// src/pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Role = "user" | "assistant";
type HistoryMsg = { role: Role; content: string };

function getBackendUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8000";
  return raw.split("#")[0].trim().replace(/\/+$/, "");
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send("chat endpoint OK");
  }
  if (req.method !== "POST") return res.status(405).end();

  const body = (req.body ?? {}) as { prompt?: unknown; history?: unknown };
  const prompt = typeof body.prompt === "string" ? body.prompt : undefined;
  const history = Array.isArray(body.history) ? (body.history as HistoryMsg[]) : ([] as HistoryMsg[]);

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' string" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const r = await fetch(`${getBackendUrl()}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history, stream: false, top_k: 4 }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await r.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    if (!r.ok) {
      try {
        const j = JSON.parse(text) as { detail?: unknown; error?: unknown };
        const msg = (typeof j.detail === "string" && j.detail) ||
                    (typeof j.error === "string" && j.error) ||
                    text;
        return res.status(r.status).send(msg);
      } catch {
        return res.status(r.status).send(text);
      }
    }

    return res.status(200).send(text);
  } catch (err: unknown) {
    return res.status(502).json({ error: errorMessage(err) });
  } finally {
    clearTimeout(timeout);
  }
}

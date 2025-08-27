// src/pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

function normalizeUrl(raw?: string) {
  if (!raw) return "";
  return raw.split("#")[0].trim().replace(/\/+$/, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send("chat endpoint OK (pages)");
  }
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { prompt, history } = req.body || {};
    const backendUrl = normalizeUrl(process.env.BACKEND_URL) || "http://localhost:8000";
    const url = `${backendUrl}/chat`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.BACKEND_API_KEY ? { Authorization: `Bearer ${process.env.BACKEND_API_KEY}` } : {}),
      },
      body: JSON.stringify({ prompt, history, stream: false, top_k: 4 }),
      cache: "no-store",
    });

    const text = await r.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(r.status).send(text);
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "Proxy failed" });
  }
}

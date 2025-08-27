import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal RAG Assistant",
  description: "Ask anything about the Israel–UAE BIT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}

import entries from "@/knowledge/public.json";
export const knowledgeVersion = "1.1 · 13 Nov 2026";
export const publicKnowledge = entries;
export function knowledgeContext() {
  return entries
    .filter((e) => e.status === "demo-ready" && e.scope === "public-general")
    .map((e) => `[${e.id}] ${e.title.en}: ${e.answer.en}`)
    .join("\n");
}

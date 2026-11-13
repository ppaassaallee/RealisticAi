import { staffAllowed } from "@/lib/auth";
import { getAnalytics, sampleAnalytics } from "@/lib/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!(await staffAllowed(req)))
    return Response.json({ error: "Staff access required" }, { status: 401 });
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || 7);
  if (![1, 7, 30].includes(days))
    return Response.json({ error: "Invalid date range" }, { status: 400 });
  const sample = url.searchParams.get("sample") === "1";
  return Response.json(
    {
      ...(sample ? sampleAnalytics(days) : getAnalytics(days)),
      source: sample ? "sample" : "live",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

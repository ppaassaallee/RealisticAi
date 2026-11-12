import { snapshot } from "@/lib/store";
import { sid, staffAllowed } from "@/lib/auth";
import { configured } from "@/lib/tavus";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const staff = new URL(req.url).searchParams.has("staff");
  if (staff && !(await staffAllowed(req)))
    return Response.json({ error: "Staff access required" }, { status: 401 });
  return Response.json(
    { ...snapshot(await sid(), staff), avatarConfigured: configured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
export async function sid() {
  return (await cookies()).get("concierge_session")?.value;
}
export async function staffAllowed(req: Request) {
  const expected = process.env.STAFF_ACCESS_TOKEN;
  if (!expected)
    return ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL("http://" + (req.headers.get("host") || "invalid")).hostname,
    );
  const actual =
    (await cookies()).get("concierge_staff")?.value ||
    req.headers.get("authorization")?.replace(/^Bearer /, "") ||
    "";
  return (
    Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

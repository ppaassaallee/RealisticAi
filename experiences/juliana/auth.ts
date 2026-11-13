import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
export type Role = "admin" | "operator" | "viewer";
export const bankCookie = "bank_interior_session";
export function roleForToken(supplied: string): Role | null {
  const tokens = {
    admin: process.env.BANK_ADMIN_TOKEN,
    operator: process.env.BANK_OPERATOR_TOKEN,
    viewer: process.env.BANK_VIEWER_TOKEN,
  };
  for (const [role, token] of Object.entries(tokens))
    if (
      token &&
      Buffer.byteLength(supplied) === Buffer.byteLength(token) &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
    )
      return role as Role;
  return null;
}
export async function bankRole(req: Request): Promise<Role | null> {
  const tokens = {
    admin: process.env.BANK_ADMIN_TOKEN,
    operator: process.env.BANK_OPERATOR_TOKEN,
    viewer: process.env.BANK_VIEWER_TOKEN,
  };
  if (!Object.values(tokens).some(Boolean))
    return ["127.0.0.1", "localhost", "[::1]"].includes(
      new URL("http://" + (req.headers.get("host") || "invalid")).hostname,
    )
      ? "admin"
      : null;
  const supplied =
    (await cookies()).get("bank_interior_staff")?.value ||
    req.headers.get("authorization")?.replace(/^Bearer /, "") ||
    "";
  return roleForToken(supplied);
}

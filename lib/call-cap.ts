import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MAX_CALL_SECONDS } from "./voice-budget";
type Lease = { token: string; conversationId?: string; expires: number };
// Single-process, persistent-disk deployment only. Shared across both avatars.
function update<T>(fn: (leases: Lease[]) => T): T {
  const file = path.resolve(
    process.env.TAVUS_USAGE_FILE || "data/tavus-usage.json",
  );
  const leases: Lease[] = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : [];
  const active = leases.filter((l) => l.expires > Date.now());
  const result = fn(active);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + ".tmp", JSON.stringify(active), { mode: 0o600 });
  fs.renameSync(file + ".tmp", file);
  return result;
}
export function reserveCall() {
  if (!process.env.TAVUS_CALL_LIMIT) return undefined;
  const limit = Number(process.env.TAVUS_CALL_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5)
    throw new Error("Invalid server call limit");
  return update((leases) => {
    if (leases.length >= limit)
      throw new Error(
        "Another demo call is active. Please finish it first or wait up to 6 minutes. / Hay otra llamada activa; finalizala primero o esperá hasta 6 minutos.",
      );
    const token = randomUUID();
    leases.push({
      token,
      expires: Date.now() + (MAX_CALL_SECONDS + 30) * 1000,
    });
    return token;
  });
}
export function bindCall(token: string | undefined, id: string) {
  if (!token) return;
  update((leases) => {
    const l = leases.find((l) => l.token === token);
    if (l) {
      l.conversationId = id;
      l.expires = Date.now() + (MAX_CALL_SECONDS + 30) * 1000;
    }
  });
}
export function releaseCall(token?: string, id?: string) {
  if (!process.env.TAVUS_CALL_LIMIT) return;
  update((leases) => {
    for (let i = leases.length - 1; i >= 0; i--)
      if (
        (token && leases[i].token === token) ||
        (id && leases[i].conversationId === id)
      )
        leases.splice(i, 1);
  });
}

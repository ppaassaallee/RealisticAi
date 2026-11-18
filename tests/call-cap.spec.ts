import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { tavus, endConversation } from "../lib/tavus";

test("cloud cap shares one slot, persists uncertainty and releases successful closures", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kiosk-cap-"));
  const previous = {
    limit: process.env.TAVUS_CALL_LIMIT,
    file: process.env.TAVUS_USAGE_FILE,
    fetch: globalThis.fetch,
  };
  process.env.TAVUS_CALL_LIMIT = "1";
  process.env.TAVUS_USAGE_FILE = path.join(dir, "usage.json");
  let createCount = 0,
    fail = false;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/end"))
      return new Response(null, { status: 204 });
    createCount++;
    if (fail) throw new Error("network timeout");
    return Response.json({ conversation_id: "call-" + createCount });
  };
  try {
    const first = await tavus("/conversations", {});
    await expect(tavus("/conversations", {})).rejects.toThrow(
      "Another demo call",
    );
    expect(createCount).toBe(1);
    await endConversation("unrelated-call");
    await expect(tavus("/conversations", {})).rejects.toThrow(
      "Another demo call",
    );
    await endConversation(first.conversation_id);
    fail = true;
    await expect(tavus("/conversations", {})).rejects.toThrow(
      "network timeout",
    );
    await expect(tavus("/conversations", {})).rejects.toThrow(
      "Another demo call",
    );
    const persisted = JSON.parse(
      fs.readFileSync(process.env.TAVUS_USAGE_FILE, "utf8"),
    );
    persisted[0].expires = Date.now() - 1;
    fs.writeFileSync(process.env.TAVUS_USAGE_FILE, JSON.stringify(persisted));
    fail = false;
    expect((await tavus("/conversations", {})).conversation_id).toBe("call-3");
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.limit === undefined) delete process.env.TAVUS_CALL_LIMIT;
    else process.env.TAVUS_CALL_LIMIT = previous.limit;
    if (previous.file === undefined) delete process.env.TAVUS_USAGE_FILE;
    else process.env.TAVUS_USAGE_FILE = previous.file;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

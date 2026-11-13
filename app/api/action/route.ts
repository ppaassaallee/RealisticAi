import { cookies } from "next/headers";
import { z } from "zod";
import {
  createSession,
  recordEvent,
  executeTool,
  mutate,
  read,
  reset,
  session,
} from "@/lib/store";
import { sid, staffAllowed, sameOrigin } from "@/lib/auth";
import { startConversation, endConversation } from "@/lib/tavus";
import { closeVoice, drainVoice } from "@/lib/voice-lifecycle";
export const runtime = "nodejs";
const flights = new Map<string, Promise<unknown>>();
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req))
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    const body = await req.json();
    const action = z.string().parse(body.action);
    const jar = await cookies();
    const id = await sid();
    if (action === "login") {
      const expected = process.env.STAFF_ACCESS_TOKEN;
      if (!expected || body.token !== expected)
        return Response.json(
          { error: "Invalid access token" },
          { status: 401 },
        );
      jar.set("concierge_staff", expected, {
        httpOnly: true,
        sameSite: "strict",
        secure: new URL(req.url).protocol === "https:",
        path: "/",
        maxAge: 28800,
      });
      return Response.json({ ok: true });
    }
    if (
      ["reset", "case", "failure"].includes(action) &&
      !(await staffAllowed(req))
    )
      return Response.json({ error: "Staff access required" }, { status: 401 });
    if (action === "session") {
      if (id) await closeVoice(id, undefined, true);
      const s = createSession(
        z.enum(["en", "es"]).parse(body.language || "en"),
        z.enum(["kiosk", "tablet", "web"]).parse(body.presentation || "kiosk"),
      );
      jar.set("concierge_session", s.id, {
        httpOnly: true,
        sameSite: "strict",
        secure: new URL(req.url).protocol === "https:",
        path: "/",
        maxAge: 14400,
      });
      return Response.json(s);
    }
    if (action === "reset") {
      for (const s of Object.values(read().sessions))
        await closeVoice(s.id, undefined, true);
      return Response.json(reset());
    }
    if (action === "case") {
      return Response.json(
        mutate((db) => {
          const c = db.cases.find((c) => c.id === body.id);
          if (!c) throw new Error("Case not found");
          const status = z.enum(["accepted", "resolved"]).parse(body.status);
          if (c.status === "resolved" && status === "accepted")
            throw new Error("Case already resolved");
          if (c.status !== status)
            recordEvent(
              db,
              c.sessionId,
              status === "accepted" ? "handoff_accepted" : "handoff_resolved",
            );
          c.status = status;
          return c;
        }),
      );
    }
    if (!id) throw new Error("Start a session first.");
    if (action === "end" || action === "avatar-end") {
      const expectedId =
        action === "avatar-end"
          ? z.string().max(100).optional().parse(body.conversationId)
          : undefined;
      await closeVoice(id, expectedId, action === "end");
      return Response.json({ ok: true });
    }
    session(read(), id);
    if (action === "response-observed") {
      const duration = z.number().min(0).max(120000).parse(body.durationMs);
      return Response.json(
        mutate((db) => {
          recordEvent(db, id, "response_observed", duration);
          return { ok: true };
        }),
      );
    }
    if (action === "tool")
      return Response.json(
        executeTool(id, z.string().parse(body.name), body.args),
      );
    if (action === "language")
      return Response.json(
        mutate((db) => {
          session(db, id).language = z.enum(["en", "es"]).parse(body.language);
          return { ok: true };
        }),
      );
    if (action === "failure")
      return Response.json(
        mutate((db) => {
          session(db, id).failure = z.boolean().parse(body.enabled);
          return { ok: true };
        }),
      );
    if (action === "avatar-status")
      return Response.json(
        mutate((db) => {
          const current = session(db, id);
          const next = z
            .enum(["connecting", "listening", "speaking", "offline", "error"])
            .parse(body.status);
          if (next === "error" && current.providerStatus !== "error")
            recordEvent(db, id, "avatar_error");
          if (next === "listening" && current.providerStatus === "connecting")
            recordEvent(db, id, "avatar_connected");
          session(db, id).providerStatus = z
            .enum(["connecting", "listening", "speaking", "offline", "error"])
            .parse(body.status);
          return { ok: true };
        }),
      );
    if (action === "avatar") {
      if (!flights.has(id)) {
        const pending = (async () => {
          await drainVoice(id);
          const s = session(read(), id);
          if (s.conversation) return s.conversation;
          const epoch = s.voiceEpoch || 0;
          const c = await startConversation(s.language);
          const result = {
            id: c.conversation_id,
            url: c.conversation_url,
            token: c.meeting_token,
          };
          try {
            mutate((db) => {
              const active = session(db, id);
              if ((active.voiceEpoch || 0) !== epoch)
                throw new Error("Call cancelled. Start again when ready.");
              active.conversation = result;
              active.providerStatus = "connecting";
            });
          } catch (e) {
            try {
              await endConversation(result.id);
            } catch {
              mutate((db) => {
                if (db.sessions[id]) db.sessions[id].pendingEndId = result.id;
              });
            }
            throw e;
          }
          return result;
        })();
        flights.set(id, pending);
      }
      try {
        return Response.json(await flights.get(id));
      } finally {
        flights.delete(id);
      }
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Please check the required fields."
            : error instanceof Error
              ? error.message
              : "Request failed",
      },
      { status: 400 },
    );
  }
}

import { cookies } from "next/headers";
import { z } from "zod";
import {
  createSession,
  executeTool,
  mutate,
  read,
  reset,
  session,
} from "@/lib/store";
import { sid, staffAllowed, sameOrigin } from "@/lib/auth";
import { startConversation, endConversation } from "@/lib/tavus";
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
      if (id) {
        const previous = read().sessions[id];
        if (previous?.conversation)
          await endConversation(previous.conversation.id);
        mutate((db) => {
          if (db.sessions[id]) db.sessions[id].ended = true;
        });
      }
      const s = createSession(
        z.enum(["en", "es"]).parse(body.language || "en"),
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
        if (s.conversation && !s.ended)
          await endConversation(s.conversation.id);
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
          c.status = status;
          return c;
        }),
      );
    }
    if (!id) throw new Error("Start a session first.");
    if (action === "end") {
      const s = read().sessions[id];
      if (s?.conversation) await endConversation(s.conversation.id);
      mutate((db) => {
        if (db.sessions[id]) {
          db.sessions[id].ended = true;
          delete db.sessions[id].verifiedPatientId;
          delete db.sessions[id].conversation;
        }
      });
      return Response.json({ ok: true });
    }
    session(read(), id);
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
    if (action === "avatar-end") {
      const s = read().sessions[id];
      if (s.conversation) await endConversation(s.conversation.id);
      mutate((db) => {
        delete db.sessions[id].conversation;
        db.sessions[id].providerStatus = "offline";
      });
      return Response.json({ ok: true });
    }
    if (action === "avatar-status")
      return Response.json(
        mutate((db) => {
          session(db, id).providerStatus = z
            .enum(["connecting", "listening", "speaking", "offline", "error"])
            .parse(body.status);
          return { ok: true };
        }),
      );
    if (action === "avatar") {
      if (!flights.has(id)) {
        const pending = (async () => {
          const s = session(read(), id);
          if (s.conversation) return s.conversation;
          const c = await startConversation(s.language);
          const result = {
            id: c.conversation_id,
            url: c.conversation_url,
            token: c.meeting_token,
          };
          try {
            mutate((db) => {
              const active = session(db, id);
              active.conversation = result;
              active.providerStatus = "connecting";
            });
          } catch (e) {
            await endConversation(result.id);
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

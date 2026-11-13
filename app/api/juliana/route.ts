import { cookies } from "next/headers";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth";
import { endConversation } from "@/lib/tavus";
import { bankCookie, bankRole, roleForToken } from "@/experiences/juliana/auth";
import {
  bankSession,
  readBank,
  writeBank,
  newBankSession,
  publicSession,
  bankMetrics,
  event,
} from "@/experiences/juliana/store";
import { runBankTool } from "@/experiences/juliana/engine";
import {
  bankVoiceConfigured,
  startBankConversation,
} from "@/experiences/juliana/provider";
import { journeyIds } from "@/experiences/juliana/config";
import knowledge from "@/experiences/juliana/knowledge.json";
export const runtime = "nodejs";
const flights = new Map<string, Promise<unknown>>();
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: Request) {
  try {
    if (new URL(req.url).searchParams.has("access"))
      return json({ allowed: Boolean(await bankRole(req)) });
    const db = readBank(),
      admin = new URL(req.url).searchParams.has("admin");
    if (admin) {
      const role = await bankRole(req);
      if (!role) return json({ error: "Acceso administrativo requerido" }, 401);
      return json({
        role,
        config: db.config,
        metrics: bankMetrics(db),
        cases: db.cases.map(({ session, ...c }) => c),
        knowledge,
        voice: bankVoiceConfigured(),
      });
    }
    const id = (await cookies()).get(bankCookie)?.value;
    let session = null;
    try {
      if (id) session = publicSession(bankSession(db, id), db);
    } catch {}
    return json({ config: db.config, session, voice: bankVoiceConfigured() });
  } catch {
    return json({ error: "No se pudo cargar la experiencia." }, 500);
  }
}
export async function POST(req: Request) {
  let id: string | undefined;
  try {
    if (!sameOrigin(req)) return json({ error: "Origen no permitido" }, 403);
    if (Number(req.headers.get("content-length") || 0) > 16000)
      return json({ error: "Solicitud demasiado grande" }, 413);
    const raw = await req.text();
    if (raw.length > 16000)
      return json({ error: "Solicitud demasiado grande" }, 413);
    const body = JSON.parse(raw),
      action = z.string().parse(body.action),
      jar = await cookies();
    id = jar.get(bankCookie)?.value;
    const cookieOptions = {
      httpOnly: true,
      sameSite: "strict" as const,
      secure: new URL(req.url).protocol === "https:",
      path: "/api/juliana",
      maxAge: 1800,
    };
    if (action === "login") {
      const token = z.string().min(1).max(256).parse(body.token);
      // Check explicit credentials, independent of Alex's staff cookie.
      const accepted = roleForToken(token);
      if (!accepted) return json({ error: "Credencial inválida" }, 401);
      jar.set("bank_interior_staff", token, {
        ...cookieOptions,
        maxAge: 28800,
      });
      return json({ ok: true });
    }
    if (["config", "case", "knowledge"].includes(action)) {
      const role = await bankRole(req);
      if (!role || role === "viewer" || (action !== "case" && role !== "admin"))
        return json({ error: "Permisos insuficientes" }, 403);
      if (action === "config")
        return json(
          writeBank((db) => {
            db.config = z
              .object({
                mode: z.enum(["community", "consulate", "fair", "mall"]),
                language: z.enum(["es", "en"]),
                accent: z.enum(["forest", "olive"]),
                notice: z.string().max(240),
                enabled: z
                  .array(
                    z.enum(
                      journeyIds as [
                        (typeof journeyIds)[number],
                        ...(typeof journeyIds)[number][],
                      ],
                    ),
                  )
                  .refine(
                    (v) => v.includes("help"),
                    "Atención humana debe permanecer activa",
                  ),
                disabledKnowledge: z.array(z.string()).max(500),
                integration: z.literal("demo"),
              })
              .parse(body.config);
            return { config: db.config };
          }),
        );
      if (action === "knowledge")
        return json(
          writeBank((db) => {
            const key = z.string().parse(body.id);
            if (!knowledge.some((k) => k.id === key))
              throw new Error("Registro no encontrado");
            db.config.disabledKnowledge = db.config.disabledKnowledge.filter(
              (id) => id !== key,
            );
            if (body.enabled === false) db.config.disabledKnowledge.push(key);
            return { config: db.config };
          }),
        );
      return json(
        writeBank((db) => {
          const c = db.cases.find((c) => c.id === body.id);
          if (!c) throw new Error("Caso no encontrado");
          const status = z.enum(["accepted", "resolved"]).parse(body.status);
          if (c.status === "resolved" && status === "accepted")
            throw new Error("Caso ya resuelto");
          c.status = status;
          return { id: c.id, status: c.status };
        }),
      );
    }
    if (action === "session") {
      if (id) {
        const old = readBank().sessions[id];
        if (old?.conversation) await endConversation(old.conversation.id);
        writeBank((db) => {
          if (db.sessions[id!]) {
            db.sessions[id!].ended = true;
            delete db.sessions[id!].conversation;
            delete db.sessions[id!].verified;
            delete db.sessions[id!].pending;
          }
        });
      }
      const s = newBankSession(
        z.enum(["es", "en"]).optional().parse(body.language),
      );
      jar.set(bankCookie, s.id, cookieOptions);
      return json(publicSession(s));
    }
    if (!id) throw new Error("Empezá una sesión primero.");
    if (action === "end" || action === "avatar-end") {
      const s = readBank().sessions[id];
      if (s?.conversation) await endConversation(s.conversation.id);
      writeBank((db) => {
        const s = db.sessions[id!];
        if (s) {
          delete s.conversation;
          if (action === "end") {
            if (!s.ended)
              event(db, s, "session_ended", {
                duration: Date.now() - s.created,
              });
            s.ended = true;
            delete s.verified;
            delete s.pending;
            delete s.result;
          }
        }
      });
      if (action === "end")
        jar.set(bankCookie, "", { ...cookieOptions, maxAge: 0 });
      return json({ ok: true });
    }
    bankSession(readBank(), id);
    if (action === "tool")
      return json(runBankTool(id, z.string().parse(body.name), body.args));
    if (action === "home")
      return json(
        writeBank((db) => {
          const s = bankSession(db, id!);
          delete s.journey;
          delete s.result;
          delete s.pending;
          return { ok: true };
        }),
      );
    if (action === "language")
      return json(
        writeBank((db) => {
          bankSession(db, id!).language = z
            .enum(["es", "en"])
            .parse(body.language);
          return { ok: true };
        }),
      );
    if (action === "feedback")
      return json(
        writeBank((db) => {
          const s = bankSession(db, id!);
          if (
            !db.events.some(
              (e) => e.session === id && e.type === "satisfaction",
            )
          )
            event(db, s, "satisfaction", {
              value: z.number().int().min(1).max(5).parse(body.value),
            });
          return { ok: true };
        }),
      );
    if (action === "response-observed" || action === "avatar-status")
      return json(
        writeBank((db) => {
          const s = bankSession(db, id!);
          if (action === "response-observed")
            event(db, s, "response_observed", {
              duration: z.number().min(0).max(120000).parse(body.durationMs),
            });
          else if (body.status === "error") event(db, s, "error");
          return { ok: true };
        }),
      );
    if (action === "avatar") {
      if (!flights.has(id)) {
        const sid = id;
        flights.set(
          id,
          (async () => {
            const s = bankSession(readBank(), sid);
            if (s.conversation) return s.conversation;
            const c = await startBankConversation(s);
            try {
              writeBank((db) => {
                bankSession(db, sid).conversation = c;
              });
            } catch (e) {
              await endConversation(c.id);
              throw e;
            }
            return c;
          })(),
        );
      }
      try {
        return json(await flights.get(id));
      } finally {
        flights.delete(id);
      }
    }
    return json({ error: "Acción no disponible" }, 400);
  } catch (error) {
    if (id)
      try {
        writeBank((db) => {
          const s = db.sessions[id!];
          if (s) event(db, s, "error");
        });
      } catch {}
    return json(
      {
        error:
          error instanceof z.ZodError
            ? "Revisá los campos. Usá solo los datos de prueba."
            : error instanceof Error
              ? error.message
              : "No se pudo completar la solicitud.",
      },
      400,
    );
  }
}

import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  journeyIds,
  journeys,
  officialLinks,
  modeTools,
  type Journey,
} from "./config";
import {
  users,
  remittances,
  products,
  bills,
  accounts,
  locations,
} from "./data";
import knowledge from "./knowledge.json";
import { bankSession, event, readBank, writeBank, type Result } from "./store";
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function searchKnowledge(query: string) {
  const disabled = readBank().config.disabledKnowledge;
  const words = normalize(query)
    .split(/\W+/)
    .filter((w) => w.length > 2);
  return knowledge
    .filter((k) => !disabled.includes(k.id))
    .map((k) => ({
      k,
      score: words.reduce(
        (n, w) =>
          n +
          (normalize(k.question + " " + k.topic).includes(w) ? 3 : 0) +
          (normalize(k.answer).includes(w) ? 1 : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.k);
}
export function detectIntent(text: string): Journey | undefined {
  const t = normalize(text);
  if (/fraude|estafa|rob[oa]|phishing|tarjeta.*perdi|perdi.*tarjeta/.test(t))
    return "fraud";
  if (/humano|persona|asesor|ayuda humana|encargado/.test(t)) return "help";
  if (/pasaporte|consula|dpi|nacimiento|documento|cita/.test(t))
    return "consular";
  if (/casita|casa|ahorr|meta|presupuesto/.test(t)) return "save";
  if (/credit|prestamo|financia/.test(t)) return "loan";
  if (
    /cobrar|recibir|recibi|mando|envio.*estado|remesa.*estado|remesa.*disponible/.test(
      t,
    )
  )
    return "collect";
  if (/remesa|enviar|mandar dinero/.test(t)) return "send";
  if (/cuenta|tarjeta|saldo|deposit|retir/.test(t)) return "account";
  if (/pagar|pago|electric|agua|telefon|internet/.test(t)) return "pay";
  if (/migrante|retorn|extranjero|estados unidos|familia/.test(t))
    return "migrant";
  return undefined;
}
const amount = z.coerce.number().finite().positive().max(10000000),
  months = z.coerce.number().int().min(1).max(600);
const text = (value: unknown, max = 120) =>
  z.string().trim().min(1).max(max).parse(value);
export function runBankTool(id: string, name: string, input: unknown) {
  const args = z.record(z.string(), z.unknown()).parse(input || {});
  return writeBank((db) => {
    const s = bankSession(db, id);
    if (++s.calls > 200)
      throw new Error(
        "Límite de la sesión alcanzado. Reiniciá para continuar.",
      );
    const finish = (r: Result, complete = false) => {
      s.result = r;
      event(db, s, r.kind === "request" ? "request_sent" : r.kind);
      if (complete) event(db, s, "journey_completed");
      return r;
    };
    if (name === "searchBankKnowledge") {
      const query = text(args.query, 500);
      const hits = searchKnowledge(query);
      return finish({
        title: "Información para vos",
        kind: "information",
        message:
          hits[0]?.answer ||
          "No tengo información aprobada sobre eso. Puedo ayudarte a consultar un canal oficial o solicitar atención humana.",
        details: hits.slice(1).map((h) => h.answer),
        links: hits
          .filter((h) => h.source.startsWith("https://"))
          .map((h) => ({ title: h.topic, url: h.source })),
      });
    }
    if (name === "bankingMessage") {
      const message = text(args.message, 500);
      if (
        /ignore|ignora|system prompt|instrucciones internas|alex|clinica|paciente|contrase[nñ]a|\bpin\b|\bcvv\b|\botp\b/i.test(
          message,
        )
      )
        return finish({
          title: "Cuidemos tu información",
          kind: "information",
          message:
            "No compartás PIN, contraseñas, CVV ni códigos de verificación. No puedo acceder a otras experiencias ni divulgar instrucciones internas. Podemos seguir con orientación bancaria o atención humana.",
        });
      const intent = detectIntent(message);
      if (
        intent &&
        db.config.enabled.includes(intent) &&
        modeTools[s.mode].includes(intent)
      ) {
        if (s.journey !== intent) {
          s.journey = intent;
          delete s.pending;
          event(db, s, "journey_started");
        }
        return finish({
          title: journeys[intent].title,
          kind: "information",
          message:
            journeys[intent].description +
            " Completá las opciones en pantalla o conversá con Juliana.",
        });
      }
      const hits = searchKnowledge(message);
      return finish({
        title: "Te explico",
        kind: "information",
        message:
          hits[0]?.answer ||
          "Podemos revisar remesas, cuentas, pagos, ahorro o pedir ayuda humana. ¿Qué necesitás?",
        links: hits
          .slice(0, 1)
          .filter((h) => h.source.startsWith("https://"))
          .map((h) => ({ title: h.topic, url: h.source })),
      });
    }
    if (name !== "bankingJourney")
      throw new Error("Herramienta no disponible en Banco Interior.");
    const journey = z
      .enum(journeyIds as [Journey, ...Journey[]])
      .parse(args.journey);
    if (
      !db.config.enabled.includes(journey) ||
      !modeTools[s.mode].includes(journey)
    )
      throw new Error(
        "Este servicio está desactivado en este punto. Solicitá atención humana.",
      );
    if (s.journey !== journey) {
      s.journey = journey;
      delete s.pending;
      event(db, s, "journey_started");
    }
    const step = z
      .enum([
        "open",
        "calculate",
        "lookup",
        "prepare",
        "confirm",
        "information",
        "request",
        "balance",
      ])
      .parse(args.step || "open");
    if (step === "open")
      return finish({
        title: journeys[journey].title,
        kind: "information",
        message: journeys[journey].description,
      });
    const pending = (details: string[], payload: Record<string, unknown>) => {
      s.pending = { id: randomUUID(), journey, args: payload };
      return finish({
        title: "Revisá antes de confirmar",
        kind: "simulation",
        message:
          "Esto es una demostración. No se moverá dinero ni se contratará un producto.",
        details,
        pendingId: s.pending.id,
      });
    };
    if (step === "confirm") {
      if (args.confirmed !== true)
        throw new Error("Necesitamos tu confirmación explícita.");
      if (
        ["account", "loan", "save"].includes(journey) &&
        args.consent !== true
      )
        throw new Error(
          "Necesitamos tu consentimiento para crear una solicitud de interés demo.",
        );
      if (
        !s.pending ||
        s.pending.id !== args.pendingId ||
        s.pending.journey !== journey
      )
        throw new Error("Revisá los datos de nuevo antes de confirmar.");
      const p = s.pending;
      delete s.pending;
      if (journey === "pay") {
        const ref = String(p.args.reference),
          key = s.id + ":" + ref;
        const existing = db.payments[key];
        const receipt =
          existing || "SIM-" + randomUUID().slice(0, 8).toUpperCase();
        db.payments[key] = receipt;
        return finish(
          {
            title: existing
              ? "Este pago ya fue simulado"
              : "Pago simulado confirmado",
            kind: "simulation",
            message:
              "El backend registró la simulación. No se debitó dinero. Este comprobante no tiene validez bancaria.",
            reference: receipt,
            details: [
              `Referencia de prueba: ${ref}`,
              `Monto de ejemplo: Q${p.args.amount}`,
            ],
          },
          !existing,
        );
      }
      const prior = db.requests.find(
        (r) => r.session === s.id && r.journey === journey,
      );
      const ref = prior?.id || "DEMO-" + randomUUID().slice(0, 8).toUpperCase();
      if (!prior)
        db.requests.push({
          id: ref,
          session: s.id,
          journey,
          consent: args.consent === true,
        });
      return finish(
        {
          title: "Referencia demostrativa creada",
          kind: "request",
          message:
            "Tu solicitud quedó en esta consola de demostración. No se abrió una cuenta, no se envió dinero y no se aprobó crédito. Un asesor demo puede acompañarte en este punto.",
          reference: ref,
        },
        !prior,
      );
    }
    const verify = () => {
      const u = users.find(
        (u) => u.id === args.userId && u.code === args.demoCode,
      );
      if (!u)
        throw new Error(
          "Los datos de prueba no coinciden. Usá una identidad del panel demo.",
        );
      s.verified = u.id;
      return u;
    };
    switch (journey) {
      case "send": {
        const n = amount.parse(args.amount);
        const origin = z.enum(["US", "GT"]).parse(args.origin || "US");
        if (args.destination && args.destination !== "GT")
          throw new Error("Este ejemplo solo tiene destino Guatemala.");
        const rate = origin === "US" ? 7.5 : 1,
          fee = origin === "US" ? 5 : 0;
        return pending(
          [
            `Origen: ${origin} → Guatemala`,
            `Monto: ${n.toFixed(2)} ${origin === "US" ? "USD" : "GTQ"}`,
            `Comisión ilustrativa adicional: ${fee} ${origin === "US" ? "USD" : "GTQ"}`,
            `Total de ejemplo a pagar: ${(n + fee).toFixed(2)}`,
            `Tipo de cambio ficticio: ${rate} GTQ por unidad`,
            `Receptor recibiría en este ejemplo: Q${(n * rate).toFixed(2)}`,
            "Siguiente paso: comparar costo total y tipo de cambio con un proveedor autorizado. No enviamos dinero.",
          ],
          { amount: n, origin },
        );
      }
      case "collect": {
        if (step === "information")
          return finish(
            {
              title: "Cómo y dónde cobrar",
              kind: "information",
              message:
                "Verificá con el proveedor el estado, identificación aceptada y punto autorizado antes de viajar. No compartás la referencia públicamente.",
              details: locations
                .slice(0, 3)
                .map((l) => l.name + " · " + l.address),
            },
            true,
          );
        const u = verify();
        const r = remittances.find(
          (r) => r.reference === args.reference && r.userId === u.id,
        );
        if (!r)
          throw new Error(
            "No encontramos un envío para esa identidad y referencia de prueba.",
          );
        const status = {
          available: "Disponible en el simulador",
          pending: "Pendiente en el simulador",
          cancelled: "Cancelada en el simulador",
          collected: "Ya cobrada en el simulador",
        }[r.status];
        return finish(
          {
            title: status || "Estado de prueba",
            kind: "simulation",
            message: `Remesa ficticia ${r.reference}: Q${r.amount}. No representa dinero disponible para cobro real.`,
            details: [
              r.status === "available"
                ? "Siguiente paso de ejemplo: presentar identificación en un punto autorizado; confirmar requisitos con el proveedor."
                : "Contactá al proveedor por su canal oficial para revisar el estado real.",
              "Este kiosco no dispensa efectivo ni realiza cobros.",
            ],
          },
          true,
        );
      }
      case "account": {
        if (step === "balance") {
          const u = verify();
          const a = accounts.find((a) => a.userId === u.id);
          return finish(
            {
              title: "Cuenta de demostración",
              kind: "simulation",
              message: a
                ? `${a.type}: saldo ficticio Q${a.balance}. No es una cuenta real.`
                : "Esta identidad no tiene cuenta de prueba.",
              details: [
                "Depósitos y retiros requieren un punto autorizado y hardware certificado. Aquí solo ofrecemos orientación.",
              ],
            },
            true,
          );
        }
        const product = products.find((p) => p.id === args.product);
        if (!product)
          throw new Error("Seleccioná un producto de demostración.");
        return pending(
          [
            product.name,
            product.purpose,
            product.requirements,
            "Sin tasas ni comisiones oficiales publicadas. No se solicita información personal.",
          ],
          { product: product.id },
        );
      }
      case "pay": {
        const reference = text(args.reference);
        const b = bills.find(
          (b) => b.reference === reference && b.service === args.service,
        );
        if (!b)
          throw new Error(
            "Referencia de prueba no encontrada para este servicio.",
          );
        if (b.status !== "ready")
          return finish({
            title:
              b.status === "pending"
                ? "Verificación pendiente"
                : "Referencia rechazada",
            kind: "simulation",
            message:
              "No confirmes ni repitas un pago real sin verificar con el proveedor. Esta referencia demo no permite confirmar.",
            details: ["Podés solicitar atención humana."],
          });
        return pending(
          [
            `Servicio de prueba: ${b.service}`,
            `Referencia: ${b.reference}`,
            `Monto ficticio: Q${b.amount}`,
          ],
          { reference: b.reference, amount: b.amount },
        );
      }
      case "loan": {
        if (step === "prepare")
          return pending(
            [
              "Interés en crédito de demostración",
              "Solo se crea una referencia local para conversar con un asesor demo; no se comparte información personal ni se solicita un préstamo real.",
            ],
            { product: "credit" },
          );
        const principal = amount.parse(args.amount),
          term = months.parse(args.months),
          annual = z.coerce
            .number()
            .finite()
            .min(0)
            .max(100)
            .parse(args.annualRate ?? 12),
          r = annual / 1200;
        const payment =
          r === 0 ? principal / term : (principal * r) / (1 - (1 + r) ** -term);
        return finish(
          {
            title: "Una cuota para entender, no una oferta",
            kind: "simulation",
            message: `Cuota mensual ilustrativa: Q${payment.toFixed(2)} durante ${term} meses.`,
            details: [
              `Capital: Q${principal.toFixed(2)} · Tasa anual de ejemplo: ${annual}%`,
              `Total ilustrativo: Q${(payment * term).toFixed(2)} · Interés: Q${(payment * term - principal).toFixed(2)}`,
              "Cálculo de cuota fija; excluye seguros, comisiones e impuestos. No es aprobación, elegibilidad ni oferta bancaria.",
              "Compará la cuota con tus ingresos y gastos. Requisitos reales pendientes de catálogo aprobado; podés solicitar un asesor.",
            ],
          },
          true,
        );
      }
      case "save": {
        if (step === "prepare")
          return pending(
            [
              "Interés en planificación de ahorro",
              "Solo se crea una referencia local para asesoría demo. No se abre una cuenta ni se envían datos de contacto.",
            ],
            { product: "saving" },
          );
        const target = amount.parse(args.target),
          term = months.parse(args.months),
          saved = z.coerce
            .number()
            .finite()
            .min(0)
            .max(target)
            .parse(args.saved ?? 0),
          monthly = (target - saved) / term;
        return finish(
          {
            title: "Tu casita empieza con un plan",
            kind: "simulation",
            message: `Ahorrando Q${monthly.toFixed(2)} al mes durante ${term} meses llegarías a Q${target.toFixed(2)}.`,
            details: [
              `Ahorro inicial: Q${saved.toFixed(2)}`,
              "Ejemplo sin intereses, inflación ni costos de construcción. Separá gastos esenciales y un fondo para imprevistos.",
              "Revisá tu presupuesto cada mes y ajustá el plazo si la cuota de ahorro no es sostenible.",
            ],
          },
          true,
        );
      }
      case "migrant":
      case "consular": {
        const country = text(args.country || "Estados Unidos", 60),
          need = text(args.need || "Orientación", 100),
          jurisdiction = text(args.jurisdiction || "Por confirmar", 80);
        return finish(
          {
            title:
              journey === "consular"
                ? "Tu siguiente paso es el canal oficial"
                : "Cerca de tu familia, estés donde estés",
            kind: "information",
            message: `Para ${need} desde ${country} (${jurisdiction}), verificá la oficina competente en el directorio oficial. No tenemos requisitos, citas, tarifas ni horarios verificados en tiempo real.`,
            details: [
              "Banco Interior es ficticio y no es autoridad consular. No proporcionamos asesoría migratoria legal personalizada.",
              "Confirmá jurisdicción y documentación directamente antes de viajar o pagar. No necesitamos conocer tu estatus migratorio.",
              journey === "migrant"
                ? "Para apoyar a tu familia: compará costos del envío, protegé la referencia y separá una parte del presupuesto para metas sostenibles."
                : "DPI y registro civil: RENAP. Pasaporte y servicios consulares: consultá MINEX y Migración según el trámite.",
            ],
            links: officialLinks,
          },
          true,
        );
      }
      case "fraud":
      case "help": {
        if (journey === "fraud" && step !== "request")
          return finish(
            {
              title: "Primero, protegé tu dinero",
              kind: "information",
              message:
                "No compartás códigos ni hagás nuevos pagos. Contactá a tu banco por el número de tu tarjeta o su app oficial para bloquear o reportar. Este demo no bloquea tarjetas.",
              details: [
                "Si hay peligro físico inmediato, buscá ayuda de emergencia local.",
                "No uses enlaces del mensaje sospechoso. Conservá evidencia fuera del kiosco; no subás datos sensibles aquí.",
                "Podés crear un caso demo para el equipo de atención.",
              ],
            },
            true,
          );
        const existing = db.cases.find(
          (c) => c.session === s.id && c.status !== "resolved",
        );
        const queue =
          journey === "fraud"
            ? "fraud"
            : z
                .enum(["general", "products", "fraud"])
                .parse(args.queue || "general");
        const c = existing || {
          id: "CASO-" + randomUUID().slice(0, 8).toUpperCase(),
          session: s.id,
          queue,
          status: "waiting" as const,
          at: Date.now(),
        };
        if (!existing) {
          db.cases.push(c);
          event(db, s, "handoff_requested");
        }
        return finish(
          {
            title: "Solicitud en espera",
            kind: "request",
            message:
              "El caso se creó en la consola demo. Todavía no hay una persona conectada. El estado cambiará cuando un operador acepte la solicitud.",
            reference: c.id,
          },
          !existing,
        );
      }
    }
  });
}

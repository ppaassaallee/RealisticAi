export function configured() {
  return Boolean(
    process.env.TAVUS_API_KEY &&
    process.env.TAVUS_PAL_ID &&
    process.env.TAVUS_REPLICA_ID,
  );
}
export async function tavus(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`https://tavusapi.com/v2${path}`, {
    method,
    headers: {
      "x-api-key": process.env.TAVUS_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `Tavus request failed (${response.status}). Check credentials, quota, and PAL configuration.`,
    );
  if (response.status === 204) return {};
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
export async function startConversation(language: "en" | "es") {
  if (!configured())
    throw new Error(
      "Live avatar is not configured. Touchscreen check-in is available.",
    );
  return tavus("/conversations", {
    pal_id: process.env.TAVUS_PAL_ID,
    face_id: process.env.TAVUS_REPLICA_ID,
    conversation_name: "OneSource synthetic patient demo",
    require_auth: true,
    custom_greeting:
      language === "es"
        ? "Hola, soy Alex, tu asistente virtual. ¡Bienvenido! ¿Cómo puedo ayudarte hoy?"
        : "Hi, I'm Alex, your AI patient concierge. Welcome! How can I help you today?",
    conversational_context: `Use the curated public knowledge for general questions, but no unverified facility facts. Synthetic data demo only. Begin in ${language === "es" ? "Spanish" : "English"}. Use the three registered tools for every workflow action. Never claim a check-in or handoff succeeded without the tool result.`,
    properties: {
      languages: language === "es" ? ["es", "en"] : ["en", "es"],
      max_call_duration: 600,
      participant_left_timeout: 10,
      participant_absent_timeout: 30,
      enable_recording: false,
      enable_closed_captions: true,
    },
  });
}
export async function endConversation(id: string) {
  await tavus(`/conversations/${encodeURIComponent(id)}/end`);
}

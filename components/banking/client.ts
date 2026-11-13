export async function bankAction(
  action: string,
  args: Record<string, unknown> = {},
) {
  const r = await fetch("/api/juliana", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...args }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "No se pudo completar la solicitud");
  return data;
}

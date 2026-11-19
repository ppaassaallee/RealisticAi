import fs from "node:fs";
import { tavus, TavusError } from "../lib/tavus";
// Updates existing assistants only; never creates a conversation or changes voice tuning.
const brand = (s: string) => s.replace(/boldr(?:[ .-]*ai|\.ai)?/gi, "OneSource")
  .replace(/Banco Interior/gi, "OneSource")
  .replace(/OneSource Welcome Clinic/gi, "OneSource Healthcare")
  .replace(/de OneSource, marca ficticia de demostración/g, "de OneSource para esta demostración de atención bancaria");
fs.mkdirSync("data", {recursive: true});
for (const [name, id] of [["Alex", process.env.TAVUS_PAL_ID], ["Juliana", process.env.JULIANA_PAL_ID]] as const) {
  if (!id) throw Error(`Missing existing ${name} configuration`);
  const path = `/pals/${id}`;
  const before = await tavus(path, undefined, "GET");
  fs.writeFileSync(`data/${name.toLowerCase()}-brand-backup-${Date.now()}.json`, JSON.stringify(before), {mode: 0o600});
  const prompt = brand(before.system_prompt);
  const operations = [{op: "replace", path: "/system_prompt", value: prompt},
    {op: "replace", path: "/pal_name", value: `${name} · OneSource`}];
  try { await tavus(path, operations, "PATCH"); }
  catch (e) { if (!(e instanceof TavusError && e.status === 304)) throw e; }
  const after = await tavus(path, undefined, "GET");
  if (after.system_prompt !== prompt || /boldr|banco interior|welcome clinic/i.test(JSON.stringify(after)))
    throw Error(`${name}: remaining remote branding requires review`);
  if (JSON.stringify(before.layers) !== JSON.stringify(after.layers)) throw Error(`${name}: unexpected voice change`);
  console.log(`${name}: OneSource branding verified; voice settings preserved; no calls started.`);
}

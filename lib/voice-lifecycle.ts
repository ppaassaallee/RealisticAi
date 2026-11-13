import { endConversation, TavusError } from "./tavus";
import { read, mutate } from "./store";
export async function closeVoice(
  id: string,
  expectedId?: string,
  endSession = false,
) {
  const closing = mutate((db) => {
    const s = db.sessions[id];
    if (!s) return undefined;
    const current = s.conversation?.id || s.pendingEndId;
    if (expectedId && current !== expectedId) return undefined;
    s.voiceEpoch = (s.voiceEpoch || 0) + 1;
    if (current) s.pendingEndId = current;
    delete s.conversation;
    s.providerStatus = "offline";
    if (endSession) {
      s.ended = true;
      delete s.verifiedPatientId;
    }
    return current;
  });
  if (!closing) return;
  try {
    await endConversation(closing);
  } catch (error) {
    if (!(error instanceof TavusError && [404, 410].includes(error.status)))
      throw error;
  }
  mutate((db) => {
    const s = db.sessions[id];
    if (s?.pendingEndId === closing) delete s.pendingEndId;
  });
}
export async function drainVoice(id: string) {
  const pending = read().sessions[id]?.pendingEndId;
  if (pending) await closeVoice(id, pending);
}

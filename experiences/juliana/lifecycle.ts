import { endBankConversation } from "./provider";
import { readBank, writeBank, event } from "./store";
// Local privacy cleanup is synchronous even if the provider is unavailable.
// An unresolved vendor close is retained and retried before another call starts.
export async function closeBankVoice(
  sessionId: string,
  expectedId?: string,
  endSession = false,
) {
  const closing = writeBank((db) => {
    const s = db.sessions[sessionId];
    if (!s) return undefined;
    const current = s.conversation?.id || s.pendingEndId;
    if (expectedId && current !== expectedId) return undefined;
    s.voiceEpoch = (s.voiceEpoch || 0) + 1;
    if (current) s.pendingEndId = current;
    delete s.conversation;
    if (endSession) {
      if (!s.ended)
        event(db, s, "session_ended", { duration: Date.now() - s.created });
      s.ended = true;
      delete s.verified;
      delete s.pending;
      delete s.result;
    }
    return current;
  });
  if (!closing) return;
  await endBankConversation(closing);
  writeBank((db) => {
    const s = db.sessions[sessionId];
    if (s?.pendingEndId === closing) delete s.pendingEndId;
  });
}
export async function drainBankVoice(sessionId: string) {
  const pending = readBank().sessions[sessionId]?.pendingEndId;
  if (pending) await closeBankVoice(sessionId, pending);
}

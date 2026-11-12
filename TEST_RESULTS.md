# Verification — November 12, 2026

- `npm run typecheck`: passed.
- `npm run build`: passed; all three screens and three API routes built.
- `npm test`: 6 passed; paid live test skipped by default.
- `LIVE_TAVUS=1 npx playwright test tests/live.spec.ts`: passed against the configured Tavus PAL using the managed `tavus-gpt-sol` model.

The live test received real remote video frames and an audio track, verified audio playback, completed multiple typed conversational turns, observed all three real model tool calls, persisted check-in, created a handoff from a Spanish request, and closed the call. Earlier live tests also observed Spanish spoken-response captions. Automated media tests use a browser test microphone. A deliberate physical-microphone conversation, speaker volume, and natural interruption quality still need a check on the presentation device.

Deterministic tests cover verification failure without appointment disclosure, appointment ownership, explicit confirmation, concurrent duplicate check-in, session repetition without reload, English/Spanish touchscreen check-in, portrait/mobile widths, separate-browser SSE handoff/accept/resolve, multiple appointments, already checked-in state, technical failure, idempotent escalation, reset, and cross-origin rejection.

Issues found and fixed: browser origin comparison, stale ended-session state, repeated media-stream attachment, and a default Tavus model that sometimes announced a handoff without dispatching its tool. The configured managed model and explicit handoff instructions passed the subsequent integration test. No recorded video is substituted for live CVI.

Credentials are configured only on the local machine and excluded from Git. Other machines need their own `.env.local`. Source is ready for a local single-process demonstration; no hosted deployment or production healthcare integration is included.

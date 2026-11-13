# Juliana expansion — November 13, 2026

- Final production build in the isolated QA checkout: passed. All Alex routes and new platform/Juliana routes generated. Three pre-existing dynamic filesystem tracing warnings remain in Alex's unchanged store.
- Final production-server suite: **70 passed, 3 opt-in tests skipped** (19.8 seconds). Includes all original Alex regression tests, all ten bank journeys, 50 Spanish written intent scenarios, privacy/isolation, consent and confirmation, duplicate payment protection, permissions, modes/tool restrictions, session expiry, knowledge schema/fixtures, touch UI, offline controls, export and switching both ways with outgoing-session cleanup.
- Juliana live Tavus test: **passed** (18.9 seconds). Real remote video/audio and playback, interrupt control, Spanish remittance lookup, home saving and credit calculations, knowledge tool retrieval, human-handoff case and call teardown. A prompt correction removed an unnecessary open-form step when all required inputs were already supplied. This test uses typed turns and a test microphone; physical microphone/room audio and regional accent quality are not certified.
- Alex live Tavus regression: **passed** (23.7 seconds). Real media, English/Spanish knowledge, appointment lookup, confirmed check-in and staff handoff. Alex's provider system prompt and layers were compared before/after Juliana setup and remained unchanged.
- Independent banking role test against production with QA-only credentials: **passed**. Administrator configuration, operator case acceptance, viewer read-only access, anonymous denial and invalid-login rejection verified.
- Production offline reload: **passed**. Cached shell hydrated, five matching public remittance entries appeared, and voice/server actions stayed disabled. Development hot reload itself needs network; offline reload is validated on the production build.
- `npm run typecheck` and `git diff --check`: passed.
- Desktop/mobile kiosk, platform selector and analytics screenshots reviewed. The custom Juliana portrait is explicitly distinguished from the live stock female Tavus face.

Testing used separate synthetic QA stores. The local presentation server remains on port 3000. No public deployment or real banking operation was performed. Alex’s core implementation, public knowledge and provider configuration were preserved. The root entry route opens the administrative selector; the kiosk page wrapper adds the user-requested discreet switcher.

## Earlier verification

# Verification — November 13, 2026

- `npm run typecheck`: passed.
- Production build in an isolated copy: passed, including `/analytics` and `/api/analytics`. Existing dynamic local-store filesystem tracing warnings remain; deployment is still a single-process local demo.
- `TEST_BASE_URL=http://127.0.0.1:3100 npm test`: 10 passed; paid live test skipped by default. QA used a separate server and data store.
- Opt-in live Tavus test: passed in 22.8 seconds. Received real video and remote audio, answered deductible and copay questions in English and Spanish, called all three workflow tools, persisted check-in and Spanish handoff, and closed the call.

New checks cover mounted-video continuity across device frames, searchable bilingual knowledge, actual analytics events, duplicate-safe completions and handoffs, access controls, exclusion of patient identifiers, sample-data isolation, CSV export, mobile navigation, date-cohort funnel counts and unknown timing values. Existing six workflow checks still pass.

Screenshots reviewed for the kiosk/tablet/web-chat frames and desktop/mobile analytics. Illustrative sample metrics are labeled and do not modify actual activity. A request-version guard prevents an earlier analytics response overwriting a newer selected view.

Voice settings were applied to the configured PAL with a local ignored backup: speed 1.05, Sparrow-2, medium turn-taking patience and high interruptibility. Browser-observed timings are not a controlled before/after speed benchmark. Automated live turns use typed input and a browser test microphone; physical microphone and room speaker quality should be checked on the presentation device.

Credentials remain local and excluded from Git. No hosted deployment, external channel connection or production healthcare integration is included.

## Earlier baseline

### November 12, 2026

- `npm run typecheck`: passed.
- `npm run build`: passed; all three screens and three API routes built.
- `npm test`: 6 passed; paid live test skipped by default.
- `LIVE_TAVUS=1 npx playwright test tests/live.spec.ts`: passed against the configured Tavus PAL using the managed `tavus-gpt-sol` model.

The live test received real remote video frames and an audio track, verified audio playback, completed multiple typed conversational turns, observed all three real model tool calls, persisted check-in, created a handoff from a Spanish request, and closed the call. Earlier live tests also observed Spanish spoken-response captions. Automated media tests use a browser test microphone. A deliberate physical-microphone conversation, speaker volume, and natural interruption quality still need a check on the presentation device.

Deterministic tests cover verification failure without appointment disclosure, appointment ownership, explicit confirmation, concurrent duplicate check-in, session repetition without reload, English/Spanish touchscreen check-in, portrait/mobile widths, separate-browser SSE handoff/accept/resolve, multiple appointments, already checked-in state, technical failure, idempotent escalation, reset, and cross-origin rejection.

Issues found and fixed: browser origin comparison, stale ended-session state, repeated media-stream attachment, and a default Tavus model that sometimes announced a handoff without dispatching its tool. The configured managed model and explicit handoff instructions passed the subsequent integration test. No recorded video is substituted for live CVI.

Credentials are configured only on the local machine and excluded from Git. Other machines need their own `.env.local`. Source is ready for a local single-process demonstration; no hosted deployment or production healthcare integration is included.

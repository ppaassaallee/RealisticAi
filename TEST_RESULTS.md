## November 13, 2026 — consumption safeguards for both avatars

Typecheck and isolated production build passed (three pre-existing filesystem tracing warnings). Full regression suite: **81 passed, 3 opt-in checks skipped**. No paid Tavus calls were created during this review.

New checks cover silence/absolute/connection timeout boundaries, both outgoing provider payloads, no automatic provider creation while browsing frames, cross-tab call exclusion for both avatars, browser clock-driven 45-second connection cancellation without automatic retries, and Alex cleanup with stale IDs, failed provider closure and ended-session retries. Provider payload tests use mocked fetch; these are not a fresh live billing measurement. Existing banking/healthcare flows, device frames and handoff synchronization passed after retaining fast polling for unresolved cases.

Defaults: 300-second provider maximum; 90-second browser voice inactivity limit; 45-second connection watchdog; retained 30-second absent-participant and 10-second participant-left provider limits. Closure releases media; browser Web Locks limit same-origin demo tabs. Browser death/offline cleanup is best effort, bounded by the provider limit. Different browsers/devices are not covered by the browser lock. Read-only inspection found zero conversation/pending-close IDs in both local application stores; this is not an account-wide Tavus audit.

Idle bank polling is reduced to 30 seconds and skipped while hidden, with four-second polling during visible live calls or unresolved handoffs. Alex server event polling reduced from 750ms to two seconds. Refresh existing tabs to load changes; no deployment or account billing settings changed.

## November 13, 2026 — Juliana call stability

- Typecheck and isolated production build passed. Build retains three existing filesystem-tracing warnings in Alex's local store.
- Regression suite: 73 passed, 3 opt-in tests skipped (paid Alex/Juliana calls and role-server configuration).
- Focused verification: 5 passed, including one real Juliana call (19.6 seconds) and four deterministic voice/error tests. Live media playback, remittance lookup, savings calculation, credit calculation, knowledge retrieval, human queue request, interruption and teardown succeeded after the account upgrade.
- Spoken turn events now renew the inactivity timer. Tests advance past two minutes with ongoing speech, then verify silence and absolute expiry still end the session.
- Stale call closures cannot terminate a newer call. Failed provider closures remain pending for retry; cancelled creation cannot attach to an ended session. Deterministic lifecycle tests use a mocked provider and temporary storage.
- Quota failures show an actionable Spanish message and release call controls. Provider details and credentials are never returned in error messages. Missing tool fields are reported so Juliana can ask for corrections.
- Existing Juliana PAL updated to medium interruptibility and medium turn-taking patience using Sparrow-2. Alex's prompt and layers compared unchanged. Setup accepts Tavus's no-change PATCH response for repeat runs.
- Typed messages pause the microphone, with a visible re-enable hint, to prevent room audio interrupting text-driven answers.

Live verification used typed turns and a browser test microphone. Physical microphone/room-speaker behavior still requires a check on the presentation device; this is not a measured latency benchmark. Local server remains available at http://127.0.0.1:3000/juliana. No hosted deployment.

# Juliana portrait and conversation polish — November 13, 2026

- Replaced the welcome portrait with a stylized 3D Juliana, using Alex as the style reference. Reviewed the rendered kiosk screenshot. Live face unchanged.
- Reduced repeated demo caveats in screen text, backend summaries and the independently configured Juliana PAL; preserved demo labels, consent, simulated transaction confirmation and actual backend results. Alex provider configuration remained unchanged.
- Production build and typecheck passed. Nine banking workflow/security/UI tests passed.
- Live banking test passed (18.2 seconds): remittance lookup, savings, credit, KB retrieval, handoff, media and teardown. The initial live run did not receive the lookup action; the repeat muted the synthetic test microphone during typed turns and passed.

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

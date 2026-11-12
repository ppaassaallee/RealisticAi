# OneSource Smart Kiosk

Next.js / TypeScript / Tailwind executive demo: a Tavus conversational avatar, bilingual patient check-in, and live receptionist handoff. **Synthetic data only.**

## Run

Requires Node 22+, Chrome for browser tests, and one Node process with a writable disk.

```sh
npm ci
cp .env.example .env.local
# Add TAVUS_API_KEY to .env.local. Never commit it.
npm run setup:tavus
npm run dev
```

Open http://127.0.0.1:3000/kiosk, `/staff`, and `/demo`. For a production build: `npm run build && npm start`. The default binding is local-only. Do not put this demonstration on the public internet without authentication for kiosk access and vendor usage limits.

Tavus setup creates Alex's PAL, registers exactly three tools, and saves the PAL/replica IDs locally. Alex uses Tavus’s managed `tavus-gpt-sol` model for reliable workflow tool calling. The default live face is Tavus's stock **Daniel – Office** (`rf4703150052`). Set `TAVUS_REPLICA_ID` before setup to use another commercially available stock face. The supplied illustrated portrait is an explicitly labeled welcome preview; it is not the live avatar. No recording or camera activation is requested. Calls are limited to ten minutes, with short absent/left-participant timeouts.

The current Tavus APIs call personas **PALs** and replicas **Faces**. This app uses `/v2/pals`, the tool registry, Daily's SDK, and `conversation.tool_result` with the original `tool_call_id`. All tool actions execute on this app's server. No additional LLM, speech, or image services are required.

## Demo journeys

All dates below are dates of birth. Appointments are synthetic same-day demo slots, not actual calendar bookings.

| Scenario                      | Name           | Date       | Patient code |
| ----------------------------- | -------------- | ---------- | ------------ |
| Check-in                      | Jordan Rivera  | 1988-04-12 | 1042         |
| Missing appointment / handoff | Taylor Morgan  | 1992-08-21 | 2043         |
| Already checked in            | Sam Bennett    | 1975-11-03 | 3044         |
| Multiple appointments         | Alex Chen      | 1986-02-14 | 4045         |
| Spanish                       | Sofia Martinez | 1990-06-18 | 5046         |
| Technical error               | Casey Brooks   | 1983-09-27 | 6047         |

1. Use `/demo` to choose a patient/language and start a session. Click **Talk to Alex**, allow microphone access, and speak the synthetic identity details. You can also type to Alex while connected, or use **Check in** without Tavus.
2. Confirm the returned appointment. Check-in is persistent and duplicate-safe. Details appear only after name, birth date, and patient code match.
3. For Taylor, request assistance after lookup. Open `/staff` in another window, click **Accept handoff**, and watch the kiosk update without refresh. **Resolve** completes the case. The summary is generated deterministically from workflow state, not from a second AI service.
4. Ask Alex to speak Spanish or use ES. Run Sofia's check-in.
5. End the session to release the microphone. Use **Restore all synthetic data** on `/demo` before repeating the demonstration. Reset ends active vendor calls before restoring data.

## Verification

With the app running:

```sh
npm run typecheck
npm test
# Optional paid vendor test, only after setup:
LIVE_TAVUS=1 npx playwright test tests/live.spec.ts
```

Normal tests cover identity privacy, appointment ownership, confirmation, concurrent duplicate check-in, repeat sessions, multiple matches, technical errors, reset, Spanish UI, responsive layout, and SSE handoff in independent browsers. Live tests are opt-in and use a short real Tavus call; they verify video/audio tracks and real model tool dispatch using typed turns. A human microphone conversation and interruption quality should also be checked on the actual presentation device. Tests mutate the synthetic demo store; do not run them during a presentation.

## Scope and configuration

- Credentials stay server-side in ignored `.env.local`; `TAVUS_PAL_ID`, `TAVUS_REPLICA_ID`, and `TAVUS_API_KEY` are required for live calls. Without them, the touchscreen flows remain usable.
- `STAFF_ACCESS_TOKEN` protects staff/operator APIs when configured. Without it, those APIs allow only localhost hostnames. The app binds loopback by default; this is a local demo access model, not production healthcare authentication.
- `DEMO_DATA_FILE` defaults to `data/demo.json`. The store uses synchronous single-process transactions and atomic rename. Keep one process and a persistent local volume; it is not a multi-worker/serverless database.
- SSE delivers server snapshots to kiosk and staff. Reconnect is automatic. Vendor connection errors expose retry by ending and restarting a call. Unload closes local tracks and requests vendor shutdown; provider timeouts bound cleanup if the browser disappears.
- Identity verification here is a synthetic demo mechanism, not a production identity assurance system. No EMR, payments, real patient data, staff video, sentiment analysis, or recordings.

Official integration references: [Create conversation](https://docs.tavus.io/api-reference/conversations/create-conversation), [Create PAL](https://docs.tavus.io/api-reference/pals/create-pal), [LLM tools](https://docs.tavus.io/sections/conversational-video-interface/pal/llm-tool), [Tool result](https://docs.tavus.io/sections/event-schemas/conversation-tool-result), [Daily call object](https://docs.daily.co/reference/daily-js/factory-methods/create-call-object).

# Juliana · Banco Interior

An independent fictional banking experience added alongside Alex. Start at `/platform` (administrative selector), `/juliana` (public kiosk), `/juliana/admin` (operations/configuration), or `/juliana/analytics` (actual application events). A discreet lower-right layers button on both kiosk screens opens the experience switcher (also Alt+Shift+E). It is shown only to users allowed into the administrative selector; switching first ends the outgoing session.

Alex remains at `/kiosk`, `/staff`, `/demo`, `/analytics` with its original files, cookies, data and PAL.

## Run and configure

Use the repository's existing `npm ci` and `npm run dev`. Optional live banking setup:

```sh
npm run setup:juliana
```

This creates a separate PAL and attaches only `bankingJourney` and `searchBankKnowledge`. It uses the existing local Tavus account key, stores `JULIANA_PAL_ID` and `JULIANA_FACE_ID` in ignored `.env.local`, refuses Alex's PAL ID and verifies Alex's prompt/layers are unchanged. No extra AI provider is required. Don't run Alex setup to configure Juliana.

The welcome image is a custom generated young Guatemalan woman. Live video uses Tavus's stock female **Luna** face (`r9d30b0e55ac`) with its own voice, Spanish by default and English conversation available. The live face is not the same as the welcome portrait; the UI discloses this. A matching custom face and licensed Guatemalan voice can replace it via `JULIANA_FACE_ID` and provider configuration. No precise regional accent or custom-face training is claimed. No pre-recorded video substitutes for a call.

Modes: community, consulate, fair and mall. Each has different service priorities. Consulate disables simulated service payments; fair disables payments and remittance lookup. Administrative tool toggles further restrict these permissions on the server. A session keeps its starting mode; new sessions receive new configuration. Integrated mode is deliberately unavailable until an approved adapter exists.

`BANK_DATA_FILE` defaults to `data/juliana/store.json`; use one Node process and a persistent writable disk. This is an atomic local demo store, not a production transactional database. It never imports Alex's store, prompt or knowledge. `lib/tavus.ts` provides the common vendor HTTP transport only. A separate adapter based on the proven Daily runtime preserves Alex's existing component byte-for-byte.

## Permissions and privacy

Optional independent `BANK_ADMIN_TOKEN`, `BANK_OPERATOR_TOKEN`, `BANK_VIEWER_TOKEN` enable credentialed roles. Admin configures tools, branding, language, notices and knowledge visibility; operator handles cases; viewer reads analytics/knowledge. Tokens stay server-side in environment variables. Without any tokens, administration is restricted to localhost hostnames, consistent with the existing local demonstration model. Bind loopback and do not publish this demo as a production bank. Alex staff credentials do not grant bank access.

Bank session cookies are HttpOnly, SameSite Strict and scoped to `/api/juliana`. Session lifetime is 30 minutes; the UI clears idle sessions after two minutes and on explicit finish. Public shell caches exclude all API responses and other experiences. No names, bank secrets, immigration status, raw conversations, audio or transcripts are retained in operational analytics. IDs are anonymous session correlation values and synthetic fixture IDs only. The UI never requests real financial information.

The store retains the latest 10,000 operational events. Administrators see anonymous events rather than raw conversations. Unique people and service availability are explicitly unmeasured, rather than fabricated. Feedback is voluntary, once per session. A simulation is never counted as a real transaction. All actual-transaction counts are zero. A local assistance request means queued; acceptance means an operator accepted the demo case, not a live video connection.

## Journeys and fixtures

All ten journeys have screen forms and a live voice tool route. Written queries also route to the matching journey, with public KB retrieval as a fallback. The text router is deterministic, not a second LLM. Voice keeps natural conversation in Tavus; verified backend results and the selected journey appear on screen via polling.

- Send remittance: illustrative quote → review → explicit confirmation → demo reference. Rate 7.5 and USD5 fee are fictional examples, never market quotes.
- Collect remittance: synthetic identity + code + matching reference → available/pending/cancelled/already-collected result. No cash dispensing.
- Accounts: five fictional products → requirements marked pending approval → consent → local demo reference. Optional voice balance tool only accesses the matching synthetic identity.
- Services: test reference → verify concept → explicit confirmation → idempotent simulated receipt. Repeat confirmation cannot create another payment.
- Credit: fixed-payment educational calculation, including zero-interest case; no approval or eligibility promise.
- Home saving: target, saved amount and months → educational monthly plan; no inflation/interest assumption.
- Migrants and consular: country, city/jurisdiction and need → official directory links and limited orientation. No invented current requirements, rates, fees or appointments.
- Fraud: protective guidance; no request for secrets and no fake card block; optional demo case.
- Human help: queue → created case → waiting/accepted/resolved status from backend.

Credit/savings interest can create a consented local reference; no real customer contact details or marketing messages are collected/sent.

Twenty synthetic users/remittances, ten accounts/payments/fictional locations, five products/credit examples/savings goals live in `data.ts`. Use DEMO-01, PRUEBA-01, REM-001 for the primary remittance scenario. SERV-001 is electricity, SERV-002 water, SERV-003 phone, SERV-004 internet. SERV-009 is pending; SERV-010 rejected. The public demo-data panel lists identities; these are not authentication credentials for real customers.

The 170-record catalog is versioned JSON with stable IDs, source, category, validity, conditions, demo indicator, escalation and approval status. Search retrieves up to three entries; it is a replaceable lexical retrieval adapter rather than a claimed vector database. Institutional terms without approval remain `PENDING_APPROVAL`. Public financial education, institutional placeholders, consular orientation and deployment context remain separate from authenticated synthetic transaction records; no private operational knowledge is exposed. See `research.md` for current source checks and limitations.

## Offline and accessibility

In a production build, after the public shell has been visited online and its service worker is active, public shell/static assets can be reused offline. Loaded public educational content remains searchable. APIs, authentication, remittance lookups and all simulations/requests are disabled offline. No offline success is queued or invented. Reconnect restores server session state if unexpired. This is not a guarantee that an unvisited page or a changed deployment is available offline.

Large text, high contrast, keyboard focus outlines, labeled form controls, reduced-motion support, captions, microphone/audio controls and responsive layouts are implemented. English conversation is supported; full English form/article translation and Mayan languages are not implemented. WCAG certification and a physical touchscreen/microphone acceptance test are not claimed.

## Tests

Regular `npm test` includes baseline Alex regression, banking workflows/isolation/security/UI tests and 50 Spanish written intent scenarios with explicit expected journey assertions. Use a separate QA server and `TEST_BASE_URL` to avoid modifying a live presentation's synthetic data. Opt-in real vendor tests incur short calls:

```sh
TEST_BASE_URL=http://127.0.0.1:3100 LIVE_JULIANA=1 npx playwright test tests/banking-live.spec.ts
TEST_BASE_URL=http://127.0.0.1:3100 LIVE_TAVUS=1 npx playwright test tests/live.spec.ts
```

The banking live test checks real video/audio tracks, typed Spanish remittance/savings/credit turns, KB retrieval, handoff, an interrupt command and teardown. It does not claim a human microphone or accent-quality evaluation. See root `TEST_RESULTS.md` for executed results.

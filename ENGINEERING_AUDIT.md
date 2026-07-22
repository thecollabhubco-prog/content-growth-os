# Content Growth OS — Engineering Audit

**Reviewer:** External senior engineering review (Principal + AI architecture + security + cost)
**Date:** 2026-07-23
**Basis:** Full source read of the `content-growth-os-source-review.zip` export (124 source files, 38 API routes, 23 tables) plus the in-repo `APP_REVIEW_BRIEF.md`, `ARCHITECTURE.md`, `API_ARCHITECTURE.md`, and `DATABASE_SCHEMA_FIXED.sql`.

> Scope note: this audit is evidence-based. Every claim cites a file. Where I could not verify something from the export (live DB state, Vercel config, running behavior), I say so explicitly rather than guess.

---

## PART 1 — What this application actually is (reverse engineered)

### 1.1 One-line summary
A single Next.js 16 app (App Router, deployed to Vercel Hobby, backed by Supabase Postgres) that presents **16 named "AI employees."** The user chats with an employee; a shared **planner → executor → responder** agent loop decides one action (reply / research / generate / publish / email / etc.), executes it by calling the app's *own* HTTP API routes, and replies in the employee's voice. Content generation is grounded in per-workspace "Business Memory" pulled from a `knowledge_items` table. Publishing to WordPress and Google is verified working; LinkedIn/X/Instagram adapters exist.

### 1.2 Architecture
- **Frontend + backend are one Next.js project.** Pages under `src/app/(app)/*`; "backend" is 38 `route.ts` serverless handlers under `src/app/api/*`. No separate service, no long-running process.
- **The agent brain** (`src/app/api/v1/agent/route.ts`, 525 lines) is the heart. It:
  1. Loads conversation history from Postgres (`conversations` / `chat_messages`) — server-side memory, good.
  2. **Planner**: one temperature-0 JSON call to a free `gpt-oss-20b` model picks one of 13 actions.
  3. **Executor**: a large `switch` runs the action, mostly by `fetch(\`${origin}/api/v1/...\`)` back into the app's own routes.
  4. **Responder**: for conversational turns, a second free-model call writes the reply.
- **LLM gateway**: `src/lib/ai/openrouter.ts` — OpenRouter, free models only, with a fallback chain across 4 free models on 429/404/502/503.
- **Brand grounding**: `src/lib/ai/context-builder.ts` tries a pgvector RPC (`search_knowledge`) then falls back to a direct row fetch, injected into every generation prompt via `src/lib/ai/prompts/shared.ts`.
- **Publishing**: `PublisherInterface` + per-platform adapters (`wordpress.ts`, `linkedin.ts`, `x.ts`, `instagram.ts`) selected by `publisher-factory`. Credentials decrypted at publish time (`AES-256-GCM`, `src/lib/encryption/tokens.ts`).
- **Research**: `src/lib/research/pipeline.ts` runs Tavily/Firecrawl + one LLM synthesis **synchronously inside the request** — deliberately, because serverless freezes after the response is sent.
- **Auth**: none. `src/proxy.ts` (middleware, renamed `proxy`) is a pass-through. A hardcoded `DEFAULT_WORKSPACE_ID` is used everywhere.

### 1.3 Data flow (a "write a LinkedIn post" turn)
Chat page → `POST /api/v1/agent` → planner returns `generate_content` → executor `fetch`es `POST /api/v1/generate/linkedin` (self-origin) → that route builds brand context, calls OpenRouter, inserts a `content_items` draft → agent formats the draft, stamps `awaiting_publish_confirmation` metadata → replies "want me to publish?" → user says "yes" → planner returns `publish` → executor `fetch`es `POST /api/v1/publish` → looks up `platform_connections`, decrypts creds, calls the platform adapter → records a `publish_attempts` row.

### 1.4 What it's *actually* doing
It is a **thin single-tenant chat wrapper over a content-generation + publishing API**, dressed as a 16-person "AI team." The "team" is almost entirely cosmetic: personas live in `src/lib/employees.ts` and `EMPLOYEE_SPECIALTY` in `catalog.ts`, but every employee routes through the same brain and the same tools — the only real per-employee differences are default platform, placeholder text, and voice ID. The core value (brand-grounded generation → one-click publish to a real WordPress site) works. Everything around it (multi-tenancy, auth, background jobs, semantic retrieval, most of the 25 pages) is either stubbed, partial, or unreachable.

---

## PART 2 — Scorecard (1–10)

| Area | Score | One-line justification |
|---|---:|---|
| Architecture | 5 | Clean single-app layout, but self-origin HTTP fan-out and 60s ceiling are structural liabilities. |
| Code Quality | 6 | Readable, well-commented, consistent. Undermined by `as unknown as` casts and copy-pasted constants. |
| Maintainability | 4 | `DEFAULT_WORKSPACE_ID` hardcoded in 44 files; two parallel agent implementations; no tests. |
| Scalability | 3 | Single-tenant by construction; serverless self-fetch doubles invocations; free-model pool is a hard cap. |
| Performance | 4 | Sequential LLM calls, self-origin round trips, no caching, no streaming. |
| Security | 2 | No auth, service-role client on every route, no OAuth CSRF `state`, SSRF surface, XSS sink. |
| AI Architecture | 5 | Planner/executor/responder is reasonable; wrecked by free-model quality, no streaming, no structured outputs. |
| UX | 5 | Chat surface is decent; no streaming, ~14 orphaned pages, slow first-token. |
| UI | 6 | Coherent design tokens, theme-aware; emoji-as-icon, inconsistent nav labels. |
| State Management | 5 | Zustand + server memory is fine; chat page re-fetches, some prop drift. |
| Backend | 4 | Routes are tidy but every one re-declares tenancy and admin client; no shared middleware. |
| Database | 6 | 23-table schema is thoughtful; RLS is defined but bypassed entirely by service-role. |
| API Design | 6 | Consistent `ok`/`Errors` envelope is a genuine strength. |
| Error Handling | 6 | Graceful degradation is a real theme (nice). Some swallowed errors hide failures. |
| Caching | 1 | Effectively none — every request recomputes brand context and hits the LLM. |
| Offline Capability | 1 | N/A / none (acceptable for this product). |
| Animation | 4 | Minimal; not a focus. |
| Accessibility | 3 | Emoji icons, unlabeled controls, `dangerouslySetInnerHTML`, low semantic structure. |
| Developer Experience | 4 | Fast to read, painful to change safely (no tests, hardcoded IDs, `AGENTS.md` warns the framework is unfamiliar). |
| Testing | 1 | Zero automated tests, no CI. |
| Cost Efficiency | 7 | Genuinely cheap today ($0 models, Hobby, Supabase free). But cheap *because* it's not production-grade. |
| Deployment | 4 | Manual `vercel deploy --prod`, no preview discipline, no gate. |
| FlutterFlow usage | N/A | **The brief's ROLE section asks about FlutterFlow/Flutter/Dart. This project contains none — it is Next.js/React/TypeScript.** See note below. |
| Overall Product Quality | 5 | A working, honest MVP with a strong demo path and a long tail of production gaps. |

**Important framing correction:** The prompt's ROLE and TASK 14 assume a **FlutterFlow / Flutter / Dart mobile app**. This codebase is a **Next.js 16 + React 19 + TypeScript web app**. There is no FlutterFlow export, no `.dart` files, no `pubspec.yaml`. I've audited what actually exists. If you have a *separate* Flutter project, it wasn't in this zip — send it and I'll review it on its own terms. Everything below is about the web app.

---

## PART 3 — Every problem found (evidence-based)

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low. Each has impact + fix + effort.

### Security (the weakest area)

**🔴 S1 — No authentication, service-role client on every route.**
`src/lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY`, which *bypasses RLS entirely*. `src/proxy.ts` is a no-op. So the 46 RLS policies in `DATABASE_SCHEMA_FIXED.sql` are dead code — nothing enforces them. Anyone with the deployed URL can read/write every workspace's data, send email through connected Gmail, and publish to connected WordPress/LinkedIn. *Impact:* total data + account compromise the moment the URL leaks. *Fix:* Supabase Auth (least-effort given the schema already FKs `auth.users`) + a real middleware guard + switch reads to an RLS-scoped anon client. *Effort:* 3–5 days.

**🔴 S2 — OAuth callbacks have no CSRF `state` nonce.**
`connections/linkedin/callback/route.ts` (and X, Instagram, Google) put only a base64 `workspace_id` in `state` — no random nonce tied to the session, no verification. `auth/google/init/route.ts` does the same. An attacker can run the OAuth dance and attach *their* account to a victim workspace (or vice versa). Combined with S1 (no session at all) the whole OAuth model is unauthenticated. *Fix:* sign `state` (HMAC) with a nonce stored in an httpOnly cookie; verify on callback. *Effort:* 1 day.

**🔴 S3 — SSRF via WordPress connect.**
`connections/wordpress/route.ts` takes a user-supplied `site_url` and the callback (`.../callback/route.ts`) `fetch`es `${siteUrl}/wp-json/wp/v2/users/me` server-side, then the adapter POSTs to it. With no auth (S1), an attacker can point it at internal addresses (`http://169.254.169.254/…`, `http://localhost:...`) and use your serverless function as a request proxy. `normalizeSiteUrl` only validates URL *shape*, not host. *Fix:* block private/link-local ranges, require https, allowlist. *Effort:* half a day.

**🟠 S4 — Stored-XSS sink in chat.**
`chat/[employeeId]/page.tsx` `formatContent()` builds HTML from message content and renders via `dangerouslySetInnerHTML`. Message content includes model output and *pasted user content*. A `<img onerror>` or `<script>`-adjacent payload in a draft or research summary executes in the boss's session. *Fix:* render markdown with a sanitizer (DOMPurify) or a safe renderer; never hand-roll HTML into `dangerouslySetInnerHTML`. *Effort:* half a day.

**🟠 S5 — Self-fetch trusts an inbound `x-workspace-id` header with no verification.**
Every route reads `request.headers.get('x-workspace-id')` and acts on it with service-role privileges. There is no check that the caller may touch that workspace (because there's no caller identity at all). This is the transport for S1's damage. *Fix:* derive workspace from the authenticated session, never from a raw client header. *Effort:* folded into S1.

**🟡 S6 — ElevenLabs key stored in `localStorage`.** `settings/page.tsx` persists the key client-side (`localStorage.setItem('elevenlabs_api_key', …)`). Any XSS (see S4) exfiltrates it; it's also sent from the browser. *Fix:* server-side only, like the other keys. *Effort:* 2 hours.

**🟡 S7 — n8n inbound webhook auth is optional.** `webhooks/n8n/route.ts` only checks the secret *if* `N8N_WEBHOOK_SECRET` is set. If unset in prod, the webhook publishes content and writes rows unauthenticated. *Fix:* fail closed — require the secret. *Effort:* 1 hour.

**🟡 S8 — Default encryption key fallback.** `encryption/tokens.ts` falls back to `'0'.repeat(64)` if `ENCRYPTION_KEY` is missing. It correctly throws on bad *length*, but a missing key silently yields an all-zero key — every token "encrypted" with a known key. *Fix:* throw if the env var is absent in production. *Effort:* 30 min.

### Architecture / scalability

**🟠 A1 — Self-origin HTTP fan-out.** The agent and chat/respond routes call the app's own endpoints via `fetch(${origin}/api/v1/...)`. This doubles serverless invocations (bad for cost + cold starts), adds a full network round trip per step, loses type safety, re-serializes JSON, and re-pays auth/setup cost. It exists so the agent "reuses the same code paths," but those code paths are just functions — call them directly. *Fix:* extract route bodies into plain `lib/` service functions; call in-process; keep the HTTP routes as thin wrappers. *Effort:* 2–3 days. **This is the single highest-leverage refactor.**

**🔴 A2 — The 60s ceiling and synchronous research.** `pipeline.ts` runs search + synthesis inline; `agent/route.ts` races a 45s soft deadline. Research "sometimes exceeds 60s" and dies. The `withDeadline` helper returns a message claiming work "is still saving in the background" — but there *is no background*; the function freezes, so that message is misleading. *Fix:* a job table + Vercel Cron worker (or Supabase Edge Function / Trigger.dev free tier). Enqueue, return immediately, poll. *Effort:* 3–4 days.

**🟠 A3 — Single-tenant in 44 places.** `DEFAULT_WORKSPACE_ID` (`393f7d35-…`) is copy-pasted into 44 files, and `chat.ts` uses a *different* default (`00000000-…-0001`) — an inconsistency that will bite the moment two code paths disagree about which workspace a row belongs to. *Fix:* one source of truth, resolved from session. *Effort:* folded into S1.

**🟡 A4 — Two parallel agent implementations.** `api/v1/agent/route.ts` (planner/executor/responder) and `api/v1/chat/respond/route.ts` (a separate intent classifier with its own `EMPLOYEE_PLATFORM` map and publish logic). The chat page uses the agent; `chat/respond` looks orphaned but still ships. Duplicate publish/delete/status logic will drift. *Fix:* delete one. *Effort:* 1 day.

**🟡 A5 — ~14 orphaned pages.** Sidebar links 10 destinations; 25 pages exist (`create`, `research`, `trends`, `gmail`, `blog`, `linkedin`, `x`, `youtube`, `newsletter`, `instagram`, `images`, `repurpose`, `approvals`, `meeting`). Built-but-unreachable surface is maintenance drag and confuses "what does this product do." *Fix:* prune or wire. *Effort:* 1 day.

### AI / prompt engineering

**🟠 AI1 — Free models cap quality and speed, and the type union is misleading.** `openrouter.ts` lists Claude/GPT-4o ids that are "intentionally unused." The planner regularly spends its 300-token budget and JSON parsing depends on a regex `match(/\{[\s\S]*\}/)` — brittle. Free models are ~7s min latency and get retired without notice. *Fix:* $5–10 OpenRouter credit unlocks `claude-haiku-4.5` for the planner (structured, fast, cheap) and keeps a free model for prose. Use OpenRouter's `response_format: json_schema` for the planner instead of regex extraction. *Effort:* 1 day; ~$5–15/mo.

**🟡 AI2 — No streaming.** `generateStream` exists but is unused; the chat page waits for the *entire* reply before showing anything. On 7s+ free models this feels broken. *Fix:* stream the responder/generation token-by-token (SSE). Biggest single perceived-speed win. *Effort:* 1–2 days.

**🟡 AI3 — Embeddings silently dead.** `generateEmbedding` calls OpenAI `text-embedding-3-small` through OpenRouter; the account 402s, so `context-builder` always falls to direct row fetch. "Semantic retrieval" is marketing, not reality. Either fund it or drop pgvector and be honest that it's keyword/recency fetch. *Fix:* use a free embedding model (e.g. `nomic-embed-text` via a free provider) or Supabase's built-in. *Effort:* half a day.

**🟡 AI4 — `case_study` knowledge type written but never read.** Confirmed: `context-builder.ts` `.in('type', [...])` list omits `case_study`, so the Business Memory UI can save it but generation never sees it. *Fix:* add to the list. *Effort:* 5 min.

**🟡 AI5 — No token/cost accounting or rate limiting.** No per-workspace usage caps. With no auth (S1), one actor can drain the free pool for everyone (shared) and rack up Tavily/Firecrawl calls. *Fix:* usage table + simple per-workspace throttle. *Effort:* 1 day.

**⚪ AI6 — Planner prompt is large and re-sent every turn.** ~2KB system prompt, no caching. On a paid model, prompt caching would cut this cost ~90%. *Fix:* enable prompt caching when you move to a cache-capable model. *Effort:* trivial once paid.

### Correctness / bugs

**🟡 B1 — `publish` status not reset to draft on failure.** In `agent` publish, a failed publish sets `replyMeta.publish_failed` but leaves the `content_items.status`; in `publish/route.ts` a failure returns early *after* recording the attempt but the item stays `draft` — okay — yet `check_status` keys off the latest `publish_attempts` row, which is correct. Low risk, but the two publish paths (agent vs chat/respond) record different metadata shapes. *Fix:* unify (see A4).

**🟡 B2 — `.single()` throws on zero rows across many routes.** Supabase `.single()` errors if 0 rows; several places (`getOrCreateConversation`, status checks) rely on it returning null. `getOrCreateConversation` will surface a PostgREST error as "existing = undefined" only because the error is ignored — but other `.single()` calls (e.g. research `check_status`) can throw and bubble. *Fix:* use `.maybeSingle()`. *Effort:* 2 hours.

**🟡 B3 — Markdown→HTML `mdToHtml` is naive and unsanitized.** Same sink as S4, plus it mangles nested lists, tables, code blocks. Publishing this to WordPress can emit broken HTML. *Fix:* a real markdown lib (`marked` + sanitize). *Effort:* half a day.

**⚪ B4 — `voice/respond/route.ts` file has mojibake.** The comment banners are corrupted (`â”€`), indicating the BOM/encoding issue the brief warns about already hit a committed file. Cosmetic but a smell. *Fix:* re-save UTF-8. *Effort:* 10 min.

**⚪ B5 — `looksLikePublishPaste` heuristic (message > 400 chars + "publish" in first 120) will misfire** on long messages that merely discuss publishing. Low frequency, but it force-publishes intent. *Fix:* tighten or drop once the planner runs on a competent model.

### DX / process

**🔴 D1 — Zero tests, no CI.** Confirmed. For an app that publishes to live sites and sends real email, this is the scariest gap after auth. *Fix:* start with the publish confirm-gate, the planner action routing, and `mdToHtml`. *Effort:* 2–3 days for a meaningful first suite.

**🟡 D2 — `AGENTS.md` says the framework is unfamiliar to the AI and to read `node_modules` docs.** Next 16 + React 19 are very new; relying on undocumented breaking changes with no tests is risk stacked on risk.

---

## PART 4 — What breaks first, by scale

- **100 users:** *Auth (S1) and the free-model shared pool (AI1).* With no auth, "100 users" = 100 people in one workspace stepping on each other. The free OpenRouter pool rate-limits almost immediately under concurrent use. **Breaks: correctness + availability.**
- **1,000 users:** *Serverless invocation cost from self-fetch (A1) + no background jobs (A2).* Every research/generate doubles invocations; the 60s ceiling means a meaningful % of requests fail. **Breaks: reliability + Vercel function limits.**
- **10,000 users:** *Single-tenant data model in practice (A3) + no caching (Caching:1) + no rate limiting (AI5).* Supabase free tier connection/row limits; every request recomputes brand context. **Breaks: DB limits + cost.**
- **100,000 users:** *The whole "call your own API over HTTP" pattern and inline LLM chains.* You need a queue, a worker tier, per-tenant isolation, and a paid model with caching. **Breaks: architecture.**
- **1,000,000 users:** Different product. Requires real multi-tenancy, streaming infra, model routing with budgets, and observability. Not a patch — a rebuild of the execution layer.

**Order to fix:** Auth → background jobs → in-process calls (kill self-fetch) → paid planner model + streaming → caching + rate limits + usage metering.

---

## PART 5 — Technology choices challenged

| Choice | Verdict | Note |
|---|---|---|
| Next.js 16 App Router | **Keep** | Right call for one-app simplicity. But 16 is bleeding-edge; pin and test. |
| Vercel Hobby | **Upgrade path needed** | The 60s ceiling is the root of half the pain. Pro (300s) is a cheap stopgap; a worker tier is the real fix. |
| Supabase Postgres | **Keep** | Excellent fit, cheap, gives you Auth + pgvector + Edge Functions you're not using. Lean in. |
| Service-role everywhere | **Change** | Should be the exception, not the default client. |
| OpenRouter | **Keep** | Good gateway. Just fund it $5–10 and use a real planner model. |
| Free models only | **Change (partial)** | Free for prose is fine; planner/router must be reliable. Haiku is pennies. |
| pgvector embeddings | **Fix or drop** | Currently dead (AI3). Don't ship "semantic" that isn't. |
| Zustand | **Keep** | Fine. |
| n8n for scheduling | **Reconsider** | You already need a job runner for A2; Vercel Cron + a job table may replace both n8n *and* the synchronous-research problem, one fewer moving part. |
| ElevenLabs (client key) | **Change storage** | Server-side. The voice feature is also a lot of surface for a "marginal" feature — consider deferring. |

**Cheapest scalable target stack:** Next.js on Vercel Pro (or stay Hobby + external worker) · Supabase (Auth + Postgres + pgvector + Edge Functions for jobs) · OpenRouter with ~$10/mo credit · Upstash Redis free tier for rate-limit + cache. Est. **<$40/mo through low thousands of users.**

---

## PART 6 — Roadmap

### 🔴 Critical (do before anyone else gets the URL)
1. Real auth + session-derived workspace (S1, S5, A3).
2. OAuth `state` CSRF + fail-closed webhook + no default encryption key (S2, S7, S8).
3. SSRF guard on WordPress connect (S3).
4. Sanitize chat/markdown rendering (S4, B3).

### 🟠 High
5. Move research + long generation to a job queue; kill the misleading "saving in background" message (A2).
6. Replace self-origin `fetch` with in-process service calls (A1).
7. Fund OpenRouter; move planner to `claude-haiku-4.5` with JSON-schema structured output (AI1).
8. First test suite + a GitHub Actions gate (D1).

### 🟡 Medium
9. Streaming responses (AI2). 10. Fix embeddings or drop the pretense (AI3). 11. Delete the duplicate agent (`chat/respond`) (A4). 12. Prune/wire orphaned pages (A5). 13. `.maybeSingle()` sweep (B2). 14. `case_study` one-liner (AI4). 15. Usage metering + rate limits (AI5).

### ⚪ Nice to have
16. Prompt caching (AI6). 17. Accessibility pass (real icons, labels). 18. UTF-8 cleanup (B4).

### Future scale
19. Per-tenant isolation + connection pooling. 20. Model-budget router with observability. 21. Worker tier.

---

## PART 7 — Top-10 lists (highest leverage first)

**Highest ROI:** (1) Auth, (2) job queue for research, (3) kill self-fetch, (4) paid planner model, (5) streaming, (6) sanitize XSS, (7) OAuth state, (8) test the publish gate, (9) rate limits, (10) fix embeddings.

**Easiest wins:** (1) `case_study` one-liner, (2) fail-closed webhook, (3) throw on missing encryption key, (4) `.maybeSingle()` sweep, (5) UTF-8 re-save, (6) delete orphaned pages, (7) move ElevenLabs key server-side, (8) SSRF allowlist, (9) OpenRouter `json_schema` for planner, (10) prune the unused Claude ids or actually use them.

**Biggest UX:** (1) streaming, (2) show "thinking/researching" states tied to real steps, (3) fix the false "saving in background" message, (4) reachable navigation, (5) draft preview before publish, (6) inline error recovery ("retry"), (7) faster planner (perceived latency), (8) empty states on library/analytics, (9) markdown that renders correctly, (10) per-employee real differentiation or drop the fiction.

**Performance:** (1) in-process calls, (2) streaming, (3) cache brand context per workspace, (4) parallelize independent LLM/DB calls, (5) paid faster model, (6) job queue removes 60s failures, (7) drop dead embedding call on the hot path, (8) reduce planner prompt size, (9) DB indexes on `(workspace_id, created_at)` hot queries, (10) avoid double JSON serialization.

**AI:** (1) structured outputs (json_schema), (2) reliable planner model, (3) streaming, (4) prompt caching, (5) real retrieval (embeddings), (6) tool-calling instead of regex-parsed JSON, (7) per-tenant token budgets, (8) eval harness for planner routing accuracy, (9) hallucination guard already good — add a post-gen fact-check pass for numbers, (10) conversation summarization to cap history growth.

**Cost reductions:** (1) stay on free prose model but cache context, (2) prompt caching on the planner, (3) in-process calls halve invocations, (4) job queue avoids paying for killed 60s functions, (5) rate limits stop abuse draining pools, (6) free embedding model vs paid OpenAI, (7) Upstash free tier for cache, (8) Supabase Edge Functions instead of n8n hosting, (9) shrink max_tokens where oversized, (10) batch/debounce analytics queries.

**Architectural:** (1) service layer (kill self-fetch), (2) auth + RLS actually enforced, (3) job/worker tier, (4) one agent implementation, (5) session-derived tenancy (one source of truth), (6) typed DB access (drop `as unknown as`), (7) shared route middleware for tenancy/errors, (8) structured tool-calling agent, (9) config for model routing, (10) separate the "16 employees" presentation layer from the single brain cleanly.

**Scalability:** (1) background jobs, (2) real multi-tenancy + RLS, (3) connection pooling (Supabase pooler), (4) caching layer, (5) rate limiting, (6) usage metering for billing, (7) streaming to cut perceived load, (8) CDN/static for the many read-only pages, (9) move off Hobby ceiling, (10) observability (error rate, p95 latency, model fallback rate).

---

## PART 8 — Answers to the brief's specific questions

1. **Cleanest way off the 60s ceiling:** a `jobs` table + Vercel Cron (1-min) worker, *or* Supabase Edge Functions/pg_cron, which keeps everything in Supabase. Enqueue → return job id → client polls `GET /jobs/:id`. This also lets you drop n8n's scheduling role. Keep the single Next app; the worker is just another route the cron hits.
2. **Is planner→executor→responder sound?** The *shape* is fine. The weaknesses are (a) free-model reliability and (b) regex JSON parsing. Move to OpenRouter/native **tool-calling with a JSON schema** on a competent-but-cheap model (Haiku). You don't need LangChain/frameworks — they'd add lock-in and weight for a 13-action switch.
3. **Least-effort real auth:** **Supabase Auth.** The schema already FKs `auth.users`, so it's the lowest-friction path — add the middleware guard, swap the hot-path reads to an RLS-scoped client, keep the service-role client only for genuinely admin tasks. Clerk/NextAuth would fight the existing model.
4. **First, highest-value tests:** the publish **confirm gate** (never publish without `awaiting_publish_confirmation`), planner action routing on a fixed prompt set, and `mdToHtml`/sanitization. These guard money/reputation actions.
5. **Risks of self-fetch:** yes — doubled invocations/cost, extra latency, lost types, cold-start amplification, and it re-crosses the (missing) auth boundary. Extract to in-process service functions.

---

*Bottom line: this is an honest, working MVP with a genuinely good demo path and disciplined graceful-failure habits. Its ceiling is set by three things in order — no auth, no background execution, and free-model reliability. Fix those three and it becomes a real product; the rest is polish.*

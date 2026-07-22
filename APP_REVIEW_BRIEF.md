# Content Growth OS — Architecture & Approach Brief

> **Purpose of this document:** A complete, honest account of what this application is, how it is built, and the decisions and trade-offs behind it — written so an external senior engineer can review it and recommend how to make it production-grade. It deliberately includes known weaknesses, not just the happy path.

---

## 1. What the app is

**Content Growth OS** is an AI-employee content operations platform for a solo founder / small marketing operation. The concept: instead of a single chatbot, the user ("the boss") manages a **team of 16 named AI employees**, each with a role (blog writer, LinkedIn specialist, researcher, newsletter writer, designer, etc.). The boss chats with an employee in natural language; the employee plans an action, executes it (research the web, generate a draft, publish to a platform, check email), and reports back. Nothing is published or sent without an explicit confirm turn.

It is a **real, deployed, working application** — not a prototype. The full chain (brand data → AI generation → publish to live WordPress) has demonstrably worked in production. It also has meaningful rough edges (documented in §9).

**Primary users / tenants:** Multi-workspace. Two real businesses (The Scaling Advisor, CollabHub) plus a virtual "Personal Brand" aggregator. Each workspace has its own brand memory and its own connected accounts.

---

## 2. Tech stack (languages, frameworks, tools, platforms)

### Language & core framework
| Layer | Choice | Version |
|---|---|---|
| Language | **TypeScript** (strict) | ^5 |
| Framework | **Next.js** (App Router, RSC + API route handlers) | 16.2.7 |
| UI runtime | **React** | 19.2.4 |
| Bundler | **Turbopack** (Next default) | — |
| Styling | **Tailwind CSS** | v4 |
| Client state | **Zustand** | ^5 |
| Utility | clsx, tailwind-merge | — |

Single codebase — the frontend (React pages) and backend (Next.js API route handlers, running as serverless functions) live in the same Next.js project. No separate backend service.

### Data & auth
| Concern | Choice |
|---|---|
| Database | **Supabase** (managed PostgreSQL) |
| DB access | Supabase JS client (`@supabase/ssr`, `@supabase/supabase-js`) via a service-role admin client server-side |
| Vector search | **pgvector** extension (embeddings for knowledge retrieval) |
| Auth | **Currently NONE** — auth guards were removed. A hardcoded placeholder system user + default workspace id are used. This is a known gap (see §9). |
| Secrets at rest | OAuth tokens & platform credentials encrypted with **AES-256-GCM** before storing in Postgres |

### AI / LLM
| Concern | Choice |
|---|---|
| LLM gateway | **OpenRouter** (single API, many models) |
| Models used | Free-tier models only (`google/gemma-4-31b-it:free`, `openai/gpt-oss-20b:free`, `nvidia/nemotron-*:free`). Paid Claude/GPT model ids exist in the type union but are intentionally unused (account is $0-funded). |
| Model strategy | Two-tier: a small disciplined model for the **planner/router** (structured JSON), a prose-optimised model for **content generation**. Multi-model fallback chain on rate-limit / retired-model errors. |
| Embeddings | OpenAI `text-embedding-3-small` (fails gracefully → falls back to direct row fetch when the paid call 402s) |

### External services / integrations
| Service | Used for |
|---|---|
| **Tavily** | Web search (research pipeline) |
| **Firecrawl** | URL scraping (research on a specific page) |
| **Jina** | (configured) reader/embeddings alternative |
| **ElevenLabs** | Text-to-speech for the "voice meeting" feature (per-employee voices); key stored client-side |
| **WordPress REST API** | Blog publishing (via Application Password / native Authorize-Application flow) |
| **LinkedIn / X / Instagram** | OAuth publishing connections |
| **Google (Gmail / Calendar / Drive / Docs)** | OAuth per-workspace; email read/send, calendar |
| **n8n** | Inbound + outbound webhooks for automation |

### Platform / DevOps
| Concern | Choice |
|---|---|
| Hosting | **Vercel** (serverless functions, `hobby` plan) |
| Deploy | Vercel CLI (`vercel deploy --prod`) + GitHub `main` |
| Source control | **GitHub** (private repo) |
| CI | None yet (no automated tests, no GitHub Actions) |
| Env management | `.env.local` locally, Vercel env vars in prod. **Known gotcha:** never pipe env values via PowerShell (injects a BOM that silently corrupts keys) — use `printf` via bash. |

### Scale (as of this brief)
- ~**124 source files**, ~**14,300 lines** of TypeScript/TSX
- **38 API route handlers**
- **23 database tables**
- **25 app pages**
- **16 AI employees**

---

## 3. Architectural approach

### 3.1 Single Next.js app, serverless-first
Everything is one Next.js App Router project deployed to Vercel. Pages are React Server/Client components; the "backend" is a set of `route.ts` handlers under `src/app/api/v1/*` that run as independent serverless functions. There is no long-running server process — **this is the single most important constraint shaping the design** (see §9, the 60-second ceiling).

### 3.2 The agent model (the heart of the app)
Originally each of the 16 employees had a hardcoded handler. This was replaced by **one agent brain** (`src/app/api/v1/agent/route.ts`) with a **planner → executor → responder** loop:

1. **Planner** — a temperature-0, JSON-only LLM call picks exactly one action from a fixed set:
   `reply | research | generate_content | publish | publish_content | check_status | save_knowledge | scan_trends | analytics | humanize | check_email | send_email | delete_last`
2. **Executor** — a big `switch` runs the chosen action, mostly by calling the app's own `/api/v1/*` endpoints over HTTP (so the agent reuses the same generation/publish/research code paths the UI uses).
3. **Responder** — for conversational actions, a second LLM call writes the human-sounding reply in the employee's voice.

Per-employee personality (name, role, specialty, default platform) lives in `src/lib/employees.ts` + `src/lib/agent/catalog.ts`. Conversation memory is **server-side**: the agent route itself persists both user and assistant turns to `conversations` / `chat_messages`.

**Safety invariant:** publishing and email-send always require an explicit confirm turn — `generate_content` stages a draft with `metadata.awaiting_publish_confirmation`, and `publish` only fires when the boss confirms against that pending draft.

### 3.3 Brand memory → every generation
`src/lib/ai/context-builder.ts` pulls the workspace's **Business Memory** (brand voice, business info, audience persona, writing preferences, service offers) out of the `knowledge_items` table and injects it into the system prompt of **all 8 generation routes** (blog, linkedin, x, instagram, youtube, newsletter, repurpose) and the agent. This is what makes output on-brand rather than generic. It tries a pgvector similarity retrieval first and falls back to a direct row fetch.

### 3.4 Publishing abstraction
`src/lib/publishing/` defines a `PublisherInterface` (`publish` / `schedule` / `draft`) with concrete adapters (`wordpress.ts`, `linkedin.ts`, `x.ts`, `instagram.ts`) selected by a `publisher-factory`. Credentials are decrypted from `platform_connections` at publish time.

### 3.5 Connections (OAuth + credentials)
- OAuth platforms (LinkedIn, X, Instagram, Google) follow an `init` → provider consent → `callback` pattern; the callback exchanges the code, encrypts the token, and stores it.
- WordPress uses the **native WordPress "Authorize Application" flow** (`wp-admin/authorize-application.php`, WP 5.6+): the user logs in on their own site, approves, and WordPress hands back a generated Application Password — no manual credential creation. A manual-entry fallback exists for hosts that block it.
- Google connections live in a **separate table** (`google_connections`) and are surfaced in the connections API as a synthetic `platform: 'google'` entry.

### 3.6 Research pipeline
`src/lib/research/pipeline.ts` runs **synchronously within the request** (Tavily/Firecrawl gather → LLM synthesises a structured brief → save to `research_sessions`). It is explicitly synchronous because fire-and-forget background work never completes on serverless (the function freezes the moment the HTTP response is sent).

---

## 4. Data model (23 tables, highlights)

- **Tenancy:** `workspaces`, `workspace_members`, `user_profiles`
- **Knowledge / brand:** `knowledge_items`, `knowledge_embeddings` (pgvector), `prompt_library`
- **Content lifecycle:** `content_items`, `content_versions`, `content_performance`, `generated_images`, `humanization_results`
- **Research:** `research_sessions`, `trend_signals`, `learning_insights`
- **Publishing:** `platform_connections`, `publish_attempts`
- **Google/email:** `google_connections`, `email_threads`, `email_drafts`
- **Ops/telemetry:** `calendar_entries`, `analytics_snapshots`, `automation_runs`, `audit_logs`

Credentials/tokens columns are encrypted (AES-256-GCM). FKs reference `auth.users` even though app-level auth is currently disabled (a real placeholder user row exists to satisfy the constraint).

---

## 5. Repository / folder structure (abridged)

```
src/
  app/
    (app)/                 # authenticated app pages (dashboard, chat, library, business, publishing, settings, ...)
      chat/[employeeId]/   # the main chat surface
    api/
      v1/
        agent/             # planner→executor→responder brain
        generate/{blog,linkedin,x,instagram,youtube,newsletter,repurpose}/
        research/  trends/  humanize/  content/  business/  brain/  stories/
        connections/{,wordpress,linkedin,x,instagram}/{,callback}/
        gmail/{search,send,threads}/  calendar/  analytics/  voice/{respond,tts}/
      auth/google/{init,callback}/
      webhooks/n8n/
  lib/
    ai/          # openrouter client, context-builder, prompts/*
    agent/       # employee capability catalog
    research/    # tavily, firecrawl, pipeline
    publishing/  # interface + per-platform adapters + factory
    google/      # oauth + gmail
    supabase/    # admin/server/client/typed helpers
    encryption/  # AES-256-GCM token crypto
    workspace/   # workspace registry + context
    employees.ts # the 16 personas
  components/layout/ + components/voice/
```

Documentation already in-repo: `ARCHITECTURE.md`, `API_ARCHITECTURE.md`, `DATABASE_SCHEMA.sql` / `DATABASE_SCHEMA_FIXED.sql`, `DEVELOPMENT_ROADMAP.md`, `FOLDER_STRUCTURE.md`.

---

## 6. Build & deploy pipeline

1. Local dev: `npm run dev` (Next + Turbopack).
2. `npm run build` — full production build + TypeScript typecheck (must pass clean; it currently does).
3. Commit → push to GitHub `main`.
4. `vercel deploy --prod` → aliased to the production domain.

No test suite, no lint gate in CI, no preview-environment discipline. Deploys are manual.

---

## 7. History / what has been built (chronological summary)

1. Initial scaffold: 16 AI employees with hardcoded per-employee chat handlers, Supabase schema, generation routes.
2. Multi-workspace architecture: per-workspace Google OAuth, workspace switcher, workspace-scoped connections.
3. **Agent rebuild:** replaced 16 hardcoded handlers with the single planner→executor→responder brain; moved chat memory server-side.
4. Model strategy: two-tier planner/prose split, free-model fallback chain, integrity guards in prompts to stop free models fabricating statistics.
5. Content Library page; research pipeline made synchronous (fixed sessions hanging forever); WordPress excerpt support.
6. **WordPress "log in with WordPress"** connection (native Authorize-Application flow) replacing manual Application Password entry.
7. Reliability fixes: replaced retired OpenRouter model ids; made the model fallback tolerate 404/502/503 (a single retired model id used to take the whole app down); made the chat client tolerant of non-JSON serverless error pages; added a server-side soft deadline and trimmed research latency to fit Vercel's 60s ceiling.
8. Business Memory populated with real brand data (ICP segments, 90-day goals, 5-pillar content strategy).

---

## 8. Product surface (what works, honestly)

**Reliable in production:** brand memory read/write, chat with employees, content generation (blog/LinkedIn/etc.), the Content Library, publishing connections (WordPress + Google verified live), all 25 pages render.

**Marginal:** the research action. It needs 3 sequential free-model calls + a web search, which sometimes exceeds Vercel's hard 60s limit. It now fails *gracefully* (clear message, no crash) rather than erroring, but it does not always complete.

---

## 9. Known weaknesses & open questions (the important part for a reviewer)

These are deliberately surfaced so the reviewer can prioritise.

1. **No authentication.** Auth guards were removed for speed; the app runs as a single placeholder user against a default workspace. Anyone with the URL can use it. **This is the #1 thing to fix for real multi-user or public use.**
2. **The 60-second serverless ceiling (Vercel Hobby).** Any inline LLM chain (research especially) risks being killed at 60s. Current mitigations: shrink the work, soft-deadline at 45s, graceful failure. Proper fixes are architectural — **background jobs / a queue** (e.g. Vercel Cron + a job table, or an external worker) so long tasks run outside the request, with the UI polling for completion. Or upgrade the plan (300s). Reviewer input wanted on the cleanest pattern here.
3. **Free-model reliability.** OpenRouter free models are rate-limited (shared pool), slow (~7s min latency), and periodically **retired without notice** (a retired id returns 404). The app is resilient to this now, but quality/latency are capped. ~$5–10 of OpenRouter credit unlocks faster/frontier models.
4. **No automated tests, no CI.** Correctness is verified by manual/ad-hoc scripts. A test suite + GitHub Actions gate is an obvious upgrade.
5. **~41 files still hardcode the default workspace UUID.** Only the publishing page + connections API are fully workspace-dynamic; other pages default to one workspace. Multi-tenant correctness is partial.
6. **Type-safety seams.** Several DB calls cast through `as unknown as Json` / `any` to work around Supabase generated-type friction. A generated-types + zod-validation pass would tighten this.
7. **Some orphaned surface.** Of 25 pages, ~14 are not linked from the sidebar (built but not wired into navigation). Product surface has outrun what's actually reachable/used — a pruning pass is worthwhile.
8. **`case_study` knowledge type** is written by the Business Memory UI but not read by the context builder (small wiring bug).
9. **Secrets hygiene.** A `CREDENTIALS_AND_TOOLS.md` with plaintext tokens exists locally and is gitignored — but the pattern is risky; secrets should live only in a manager / Vercel env.
10. **Embeddings path** depends on a paid OpenAI key that 402s on the current account, so vector retrieval silently degrades to direct fetch. Fine functionally, but the "semantic" retrieval isn't really active.

---

## 10. Specific questions for the reviewer

1. What's the cleanest way, on this stack, to move long AI tasks (research, multi-step generation) off the request path so the 60s ceiling stops mattering — while keeping the single-Next.js-app simplicity?
2. Is the planner→executor→responder agent pattern sound, or should this move to a structured tool-calling / function-calling framework (and if so, which)?
3. Auth: given the multi-workspace model already in the schema, what's the least-effort path to real auth (Supabase Auth? Clerk? NextAuth?) without rewriting the data model?
4. Where would you add the first, highest-value tests?
5. Any structural risks in reusing the app's own HTTP endpoints from inside the agent route (origin fetch to self)?

---

*Prepared as a review brief. The full source is available in the private GitHub repository (see accompanying note on access).*

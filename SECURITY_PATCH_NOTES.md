# Content Growth OS — Security & Refactor Patch Notes

**Date:** 2026-07-23
**Author:** External engineering review (follow-on to `ENGINEERING_AUDIT.md`)
**Where the code lives:** These changes were made in the **review copy** of the source (the extracted `content-growth-os-source-review.zip`), as a reference patch to port into the private GitHub repo. Nothing here was pushed to your live repo.

> This document is the port guide. Every change is small and mechanical; apply them in the repo, run `npm run build` (must pass clean), then deploy.

---

## What was changed (complete list)

### Workstream 1 — Security fixes (done)

| # | File(s) | Change |
|---|---|---|
| S8 | `src/lib/encryption/tokens.ts` | Throw if `ENCRYPTION_KEY` is missing **in production** (no more silent all-zero key). Dev keeps a deterministic dev key. |
| S7 | `src/app/api/webhooks/n8n/route.ts` | **Fail closed**: reject the webhook if `N8N_WEBHOOK_SECRET` is unset or mismatched (was: only checked when set). |
| AI4 | `src/lib/ai/context-builder.ts` | Added `case_study` to the knowledge-type fetch list so Business Memory case studies actually reach generation. |
| S3 | new `src/lib/security/ssrf.ts` + `connections/wordpress/route.ts` + `.../callback/route.ts` | SSRF guard: reject private / loopback / link-local / metadata hosts before any server-side fetch of the user-supplied WordPress URL. |
| S2 | new `src/lib/security/oauth-state.ts` + all 4 OAuth init routes + all 4 callbacks | Signed OAuth `state` (HMAC) bound to an httpOnly nonce cookie. Kills the CSRF / account-attachment hole. X's PKCE `code_verifier` now rides in the signed payload. |
| S4 | `src/app/(app)/chat/[employeeId]/page.tsx` | HTML-escape message content **before** the markdown transforms, closing the `dangerouslySetInnerHTML` stored-XSS sink. |

### Workstream 2 — Self-fetch refactor (publish path done; pattern established)

| File(s) | Change |
|---|---|
| new `src/lib/services/publishing.ts` | `publishContentItem()` — the single source of truth for publishing a staged item. |
| `src/app/api/v1/publish/route.ts` | Now a thin wrapper over the service. |
| `src/app/api/v1/agent/route.ts` (`publish` action) | Calls the service in-process — **no more `fetch(${origin}/api/v1/publish)`**. |
| `src/app/api/v1/chat/respond/route.ts` (`confirm_publish`) | Calls the service in-process; removed unused `origin`. |
| `src/app/api/webhooks/n8n/route.ts` (`publish_scheduled_content`) | Calls the service; the four previously-divergent publish implementations are now one. |

### Workstream 3 — Auth enforcement (framework done; sensitive routes converted)

| File(s) | Change |
|---|---|
| new `src/lib/auth/context.ts` | `requireApiAuth(request)` — verifies the Supabase session AND workspace membership, returns `{ userId, workspaceId }` or a 401/403 response. **Workspace is derived from the verified session, not the raw header.** |
| `src/proxy.ts` | Real Next.js 16 middleware guard: refreshes the session and blocks unauthenticated access (401 for `/api/*`, redirect to `/login` for pages). Was a no-op. |
| `src/app/api/v1/agent/route.ts` | Entry now calls `requireApiAuth`; forwards the session cookie on its remaining internal self-fetches so they authenticate under the guard. |
| `src/app/api/v1/publish/route.ts`, `gmail/send/route.ts`, `generate/blog/route.ts` | Converted to `requireApiAuth` (the money actions + one generate route as the worked example). |
| `.env.example` | Added `OAUTH_STATE_SECRET`. |

---

## Remaining mechanical work (to finish Workstream 3)

Every other `route.ts` under `src/app/api/v1/*` still uses the old pattern:

```ts
const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-...'
```

Replace with (identical everywhere):

```ts
import { requireApiAuth } from '@/lib/auth/context'
// ...
const auth = await requireApiAuth(request)
if (!auth.ok) return auth.response
const { workspaceId } = auth.ctx
```

**Routes still to convert** (~30): `generate/{linkedin,x,instagram,youtube,newsletter,repurpose}`, `research`, `trends`, `humanize`, `content`, `business`, `brain`, `stories`, `analytics`, `calendar`, `voice/*`, `gmail/{search,threads}`, `connections/*` (list + init), `conversations/[employeeId]`. Note `conversations` also uses the *wrong* default (`00000000-…-0001`) — fixing it via `requireApiAuth` removes that inconsistency automatically.

**Ordering constraint:** the middleware guard and the `requireApiAuth` conversions should land together. Until every agent self-fetch target is converted, the cookie-forward bridge in `agent/route.ts` keeps them working. Once the generate/trends/analytics/humanize/brain/gmail routes are **also extracted into in-process services** (same pattern as `publishing.ts`), the self-fetches — and the cookie forward — disappear entirely. That is the end state the audit recommends.

---

## Database / RLS posture (not code — do this in Supabase)

The schema already defines RLS policies, but they are dead because every route uses the **service-role** client, which bypasses RLS. Two-step fix:

1. **Keep** the service-role client only for genuine admin/system work (token refresh, the n8n scheduler, cross-workspace personal-brand reads).
2. **Switch user-facing reads/writes** to an RLS-scoped client built from the request session (`@supabase/ssr` `createServerClient`), so Postgres enforces `workspace_members` membership even if application code has a bug. `requireApiAuth` already proves membership at the app layer; RLS is defence in depth.

Verify each policy is `USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))` (or equivalent) before relying on it.

---

## New environment variables

| Var | Required | Notes |
|---|---|---|
| `OAUTH_STATE_SECRET` | Recommended (prod) | HMAC key for OAuth state. Falls back to `ENCRYPTION_KEY` if unset. |
| `ENCRYPTION_KEY` | **Now hard-required in production** | App throws on boot if missing in prod. |
| `N8N_WEBHOOK_SECRET` | **Now hard-required** to use the n8n webhook | Webhook rejects all requests if unset. |

---

## Suggested test coverage to add with these changes

1. `oauth-state.ts`: valid round-trip verifies; tampered signature fails; wrong cookie nonce fails.
2. `ssrf.ts`: `169.254.169.254`, `localhost`, `10.x`, `192.168.x`, `::1`, `*.internal` all rejected; a normal https host passes.
3. `requireApiAuth`: no session → 401; session but non-member workspace → 403; member → resolves workspace.
4. `publishContentItem`: missing connection → failure result; success flips `content_items.status` and records a `publish_attempts` row.
5. Chat `formatContent`: `<img onerror=x>` renders as escaped text, `**bold**` still renders.

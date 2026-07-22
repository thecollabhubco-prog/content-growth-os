import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateConversation, loadMessages, saveMessage } from '@/lib/db/chat'
import { getEmployee } from '@/lib/employees'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { EMPLOYEE_SPECIALTY, PLATFORM_CONFIG, type ContentPlatform } from '@/lib/agent/catalog'
import { performResearch } from '@/lib/research/pipeline'
import { logger } from '@/lib/logger'

// The agent may run research (web search + LLM synthesis) inline — allow 60s.
// 60 is a HARD ceiling on Vercel's Hobby plan; it cannot be raised. Anything
// that overruns is killed by the platform, which then returns a plain-text
// error page instead of JSON. Hence the internal deadline below.
export const maxDuration = 60

// Leave headroom inside maxDuration so we can still write the reply to the DB
// and return valid JSON rather than being killed mid-flight.
const SOFT_DEADLINE_MS = 45_000

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

/** Resolves to `null` if the work outruns the remaining request budget. */
async function withDeadline<T>(work: Promise<T>, startedAt: number): Promise<T | null> {
  const remaining = SOFT_DEADLINE_MS - (Date.now() - startedAt)
  if (remaining <= 0) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), remaining) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

type PlannerAction =
  | 'reply' | 'research' | 'generate_content' | 'publish' | 'publish_content'
  | 'check_status' | 'save_knowledge' | 'scan_trends' | 'analytics'
  | 'humanize' | 'check_email' | 'send_email' | 'delete_last'

// Light Markdown → HTML for content the user pastes in to be published.
function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inList = false
  const inline = (s: string) => s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { if (inList) { out.push('</ul>'); inList = false } continue }
    if (/^#\s+/.test(line)) { out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`); continue }
    if (/^##\s+/.test(line)) { out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue }
    if (/^###\s+/.test(line)) { out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue }
    if (/^>\s?/.test(line)) { out.push(`<blockquote><p>${inline(line.replace(/^>\s?/, ''))}</p></blockquote>`); continue }
    if (/^[-*]\s+/.test(line)) { if (!inList) { out.push('<ul>'); inList = true } out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue }
    out.push(`<p>${inline(line)}</p>`)
  }
  if (inList) out.push('</ul>')
  return out.join('\n')
}

interface PlannerResult {
  action: PlannerAction
  params: Record<string, unknown>
  reply: string
}

interface HistoryMsg {
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// PLANNER — decides what the employee should DO with this message
// ─────────────────────────────────────────────────────────────
async function plan(
  employeeName: string,
  role: string,
  specialty: string,
  defaultPlatform: string | undefined,
  history: HistoryMsg[],
  message: string,
  pendingDraft: { content_item_id: string; platform: string } | null
): Promise<PlannerResult> {
  const convo = history.slice(-8)
    .map(m => `${m.role === 'user' ? 'Boss' : employeeName}: ${m.content}`)
    .join('\n')

  const systemPrompt = `You are the decision layer for ${employeeName}, a ${role} on an AI content team. Specialty: ${specialty}.
Your boss is chatting with you. Decide the SINGLE best action for their latest message and respond with ONLY strict JSON:
{"action":"<action>","params":{...},"reply":"<what to say>"}

Actions:
- "reply": normal conversation — greetings, questions, opinions, acknowledgements, clarifications. Put your natural, in-character response in "reply". USE THIS whenever the boss is just talking, asking how you are, or asking a question you can answer directly. Do NOT write posts/articles/drafts inside a reply — if they want a content piece, use generate_content instead. NEVER claim in a reply that you published, posted, sent, scheduled, or created anything — you literally cannot do those in a reply, only real tools can, so never fabricate a success message or a URL.
- "publish_content": the boss PROVIDES a finished piece of content (pastes an article/post) and asks you to publish it as-is. params: {"platform":"blog|linkedin|x|instagram","title":"<short title, e.g. the content's H1>"}. IMPORTANT: do NOT copy the content into params — the system already has the full message. Just set platform and title. Use this whenever the message contains a large block of ready content plus an instruction to publish/post it. Do NOT use generate_content for this (that would rewrite it).
- "research": run deep web research. params: {"query":"<what to research>","type":"topic|url|keyword"}. Use type "url" if the query is a URL.
- "generate_content": draft a piece of content. params: {"platform":"blog|linkedin|x|instagram|youtube|newsletter","topic":"<subject>","format":"<optional>"}. Default platform for this employee: ${defaultPlatform || 'infer from request'}.
- "publish": publish the LAST draft to its platform. ONLY choose this if the boss clearly confirms publishing (e.g. "yes post it", "go ahead", "publish it"). ${pendingDraft ? `There IS a draft awaiting confirmation for platform "${pendingDraft.platform}".` : 'There is NO draft awaiting confirmation — do NOT choose publish.'}
- "check_status": the boss asks whether something was posted/published/sent, or its current state. params: {"platform":"<optional platform>"}
- "save_knowledge": the boss wants to save brand voice / persona / offer / business info. params: {"type":"brand_voice|business_info|audience_persona|offer|writing_preference|case_study|custom","title":"...","content":"..."}
- "scan_trends": scan for trending topics. params: {"industry":"..."}
- "analytics": the boss asks how content is performing, how much was produced/published, output stats, or "how are my posts doing". params: {}
- "humanize": check/rewrite content to sound human. params: {"content":"..."}
- "check_email": read/summarize the inbox. params: {"query":"<optional gmail search>"}
- "send_email": ONLY if boss clearly confirms sending a specific email. params: {"to":"...","subject":"...","body":"..."}
- "delete_last": delete the last draft. params: {}

Rules:
- When unsure, prefer "reply" and ask a clarifying question. NEVER run research or generate content just because a message mentions a topic — only when the boss is actually asking you to DO it now.
- Any request to write/draft/create/make/give me a post, article, tweet, thread, caption, script, newsletter, or "content" about something → generate_content. Never write that content yourself inside a reply.
- A question about whether work is already done is ALWAYS check_status, never the action itself. Messages starting with "did you", "have you", "is it done", "is it ready", "already", or ending with "yet?" are check_status. Examples:
    "did you research the collabhub yet?" → check_status
    "have you posted it?" → check_status
    "research the collabhub" → research
    "is the research done?" → check_status
    "write a linkedin post about delegation" → generate_content {"platform":"linkedin","topic":"delegation"}
    "draft a blog on onboarding" → generate_content {"platform":"blog","topic":"onboarding"}
    "how are you?" → reply
- Keep "reply" warm, brief, human, and in-character.

Recent conversation:
${convo || '(none yet)'}`

  try {
    const result = await generate({
      // The planner needs disciplined, structured JSON routing — the reasoning-
      // tuned gpt-oss model follows the action schema far more reliably than the
      // prose-tuned default (which tends to just answer inline). Content quality
      // is handled separately by the content-generation model.
      model: 'openai/gpt-oss-20b:free',
      systemPrompt,
      userPrompt: `Boss's latest message: "${message}"`,
      temperature: 0,
      maxTokens: 300,
    })
    const match = result.content.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as PlannerResult
      if (parsed.action) return { action: parsed.action, params: parsed.params || {}, reply: parsed.reply || '' }
    }
  } catch (err) {
    logger.error('Planner failed, defaulting to reply', { error: String(err) })
  }
  // Safe fallback: converse, never robotically generate.
  return { action: 'reply', params: {}, reply: '' }
}

// ─────────────────────────────────────────────────────────────
// RESPONDER — turns raw tool output into a natural in-character reply
// ─────────────────────────────────────────────────────────────
async function respond(
  employeeName: string,
  role: string,
  history: HistoryMsg[],
  message: string,
  brandContext: string
): Promise<string> {
  const convo = history.slice(-8)
    .map(m => `${m.role === 'user' ? 'Boss' : employeeName}: ${m.content}`)
    .join('\n')
  const systemPrompt = `You are ${employeeName}, a ${role} on your boss's AI content team. Reply like a sharp, friendly human teammate — natural, concise, never robotic. You have real memory of this conversation. IMPORTANT: never claim you have published, posted, sent, scheduled, or created something — you're only talking here. Do not invent URLs or success confirmations.${brandContext ? `\n\nBrand context you know:\n${brandContext}` : ''}`
  const result = await generate({
    systemPrompt,
    userPrompt: `Recent conversation:\n${convo}\n\nBoss: ${message}\n\n${employeeName}:`,
    temperature: 0.8,
    maxTokens: 400,
  })
  return result.content.trim()
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  try {
    const { origin } = new URL(request.url)
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const body = await request.json()
    const { employeeId, message } = body as { employeeId: string; message: string }

    if (!employeeId || !message) return Errors.validation('employeeId and message are required')
    const employee = getEmployee(employeeId)
    if (!employee) return Errors.notFound('Employee')

    const spec = EMPLOYEE_SPECIALTY[employeeId] || { specialty: employee.role, primaryTool: 'reply' as const }

    // ── MEMORY: load conversation from DB (source of truth) ──
    const conversation = await getOrCreateConversation(employeeId, workspaceId)
    const dbMessages = await loadMessages(conversation.id, 40)
    const history: HistoryMsg[] = dbMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      metadata: (m.metadata as Record<string, unknown>) || {},
    }))

    // Find a draft awaiting publish confirmation from recent assistant turns
    const pendingDraft = (() => {
      for (let i = history.length - 1; i >= 0; i--) {
        const md = history[i].metadata
        if (md?.awaiting_publish_confirmation && md?.content_item_id && md?.platform) {
          return { content_item_id: String(md.content_item_id), platform: String(md.platform) }
        }
        // stop searching once we pass a published/cancelled marker
        if (md?.published || md?.publish_cancelled) break
      }
      return null
    })()

    // Persist the user's message immediately (reliable server-side memory)
    await saveMessage(conversation.id, workspaceId, 'user', message)

    const plan_ = await plan(employee.defaultName, employee.role, spec.specialty, spec.defaultPlatform, history, message, pendingDraft)

    // Safety net: a long pasted block with a publish/post instruction is almost
    // always "publish this content" — force it even if the planner misfired
    // (the planner can't reliably echo a long paste into its JSON output).
    const looksLikePublishPaste = message.length > 400
      && /\b(publish|post)\b/i.test(message.slice(0, 120))
      && !pendingDraft
    if (looksLikePublishPaste && plan_.action !== 'publish_content') {
      plan_.action = 'publish_content'
      plan_.params = {}
    }

    let replyContent = ''
    let replyMeta: Record<string, unknown> = {}
    const db = createAdminClient()

    const headers = { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId }

    switch (plan_.action) {
      // ── Plain conversation ──
      case 'reply': {
        if (plan_.reply && plan_.reply.length > 2) {
          replyContent = plan_.reply
        } else {
          const brandContext = await buildKnowledgeContext(workspaceId, message).catch(() => '')
          replyContent = await respond(employee.defaultName, employee.role, history, message, brandContext)
        }
        break
      }

      // ── Research (runs synchronously, returns real findings) ──
      case 'research': {
        const query = String(plan_.params.query || message)
        const type = ['url', 'keyword', 'topic'].includes(String(plan_.params.type)) ? String(plan_.params.type) : 'topic'
        const outcome = await withDeadline(performResearch(workspaceId, query, type, query), startedAt)
        if (!outcome) {
          replyContent = `That research ran longer than I'm allowed in a single request, so I stopped it before it got cut off. It's still saving in the background — check the Research section shortly. If you want it faster, narrow it to one specific question rather than a broad sweep.`
          break
        }
        if (outcome.status === 'failed') {
          replyContent = `I hit a snag running that research: ${outcome.error || 'the search or synthesis failed'}. Want me to try again?`
          break
        }
        replyContent = `Here's what I found on **"${query}"**:\n\n${outcome.summary}\n\nThe full brief — keyword opportunities, topic clusters, competitor gaps and recommended formats — is saved in the Research section. Want me to turn any of this into content?`
        replyMeta = { research_session_id: outcome.sessionId }
        break
      }

      // ── Generate content (always followed by a confirm-before-publish prompt) ──
      case 'generate_content': {
        const platform = (['blog','linkedin','x','instagram','youtube','newsletter'].includes(String(plan_.params.platform))
          ? String(plan_.params.platform)
          : spec.defaultPlatform || 'linkedin') as ContentPlatform
        const cfg = PLATFORM_CONFIG[platform]
        const topic = String(plan_.params.topic || message)
        const format = plan_.params.format ? String(plan_.params.format) : cfg.defaultFormat

        const res = await fetch(`${origin}${cfg.generatePath}`, {
          method: 'POST', headers,
          body: JSON.stringify({ input: { topic }, format, use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) { replyContent = `I ran into an issue drafting that: ${data.error?.message}`; break }
        const d = data.data

        // Build a readable rendering of whatever the generator returned
        const rendered =
          d.article ? `**${d.seo_title || d.h1 || topic}**\n\n${d.article}` :
          d.post ? d.post :
          d.caption ? d.caption :
          d.body ? `**${d.subject_line || topic}**\n\n${d.body}` :
          d.script ? `**Script:**\n${d.script}` :
          d.tweets ? [d.hook_tweet, ...d.tweets.map((t: {text:string}) => t.text), d.closing_tweet].filter(Boolean).join('\n\n') :
          JSON.stringify(d, null, 2)

        const canPublish = !!cfg.publishPlatform && !!d.content_item_id
        replyContent = `Here's your ${cfg.label}:\n\n---\n\n${rendered}\n\n---\n\n${canPublish ? `Want me to publish this to ${cfg.publishPlatform}? Just say "yes, post it" and I will — otherwise tell me what to change.` : `Let me know if you want any changes.`}`
        replyMeta = d.content_item_id
          ? { content_item_id: d.content_item_id, platform: cfg.publishPlatform, ...(canPublish ? { awaiting_publish_confirmation: true } : {}) }
          : {}
        break
      }

      // ── Publish content the boss pasted in (verbatim), with confirmation ──
      case 'publish_content': {
        const platform = (['blog','linkedin','x','instagram'].includes(String(plan_.params.platform))
          ? String(plan_.params.platform)
          : (spec.defaultPlatform === 'blog' ? 'blog' : (spec.defaultPlatform || 'blog'))) as ContentPlatform
        const cfg = PLATFORM_CONFIG[platform]
        if (!cfg.publishPlatform) { replyContent = `I can draft that, but ${platform} can't be auto-published yet — no connection type for it.`; break }

        // Content comes from the ORIGINAL message (the planner never echoes it,
        // to avoid token-limit truncation).
        let raw = String(plan_.params.content || '').trim()
        if (raw.length < 80) raw = message.trim()

        let title = String(plan_.params.title || '').trim()
        let slug = ''
        let metaDescription = ''
        let body = raw

        // Structured skill-output format (### SEO METADATA / ### FULL BLOG POST /
        // ### SCHEMA MARKUP / ### NANO BANANA IMAGE PROMPT). Pull the real fields
        // out instead of guessing — this is what broke the first publish: the
        // "first heading" heuristic matched "### SEO METADATA" itself and left
        // the metadata block, schema JSON, and image prompt all in the body.
        const hasStructuredOutput = /###\s*SEO METADATA/i.test(raw) && /###\s*FULL BLOG POST/i.test(raw)
        if (hasStructuredOutput) {
          const h1Match = raw.match(/H1\s*Title:\s*(.+)/i)
          const slugMatch = raw.match(/URL\s*Slug:\s*(.+)/i)
          const metaMatch = raw.match(/Meta\s*Description:\s*(.+)/i)
          if (h1Match) title = h1Match[1].trim()
          if (slugMatch) slug = slugMatch[1].trim().replace(/^\/?(blog\/)?/i, '').replace(/\/$/, '')
          if (metaMatch) metaDescription = metaMatch[1].trim()

          // Body = everything between "FULL BLOG POST" and the next "### " section
          // (SCHEMA MARKUP / NANO BANANA / etc), so none of that junk leaks in.
          const afterMarker = raw.split(/###\s*FULL BLOG POST/i)[1] || ''
          body = afterMarker.split(/\n###\s+/)[0].trim()
          // Drop a leading "---" separator line the skill template includes
          body = body.replace(/^-{3,}\s*\n+/, '').trim()
        } else {
          // Plain paste: drop a leading "publish/post this ..." instruction line,
          // then hard-stop before any schema/image-prompt section if present —
          // never publish those as part of the article.
          body = raw.replace(/^[^\n]*\b(publish|post)\b[^\n]*:?\s*\n+/i, '').trim()
          body = body.split(/\n#{1,3}\s*(SCHEMA MARKUP|NANO BANANA)/i)[0].trim()
        }

        if (body.length < 40) { replyContent = `I don't see the full content to publish — paste the piece and I'll get it ready.`; break }

        if (!title) {
          const h1 = body.match(/^#\s+(.+)$/m)
          title = h1 ? h1[1].trim() : body.split('\n')[0].replace(/^#+\s*/, '').slice(0, 120)
        }
        // Don't duplicate the title as an H1 inside the body — WordPress already
        // renders the post title above the content.
        body = body.replace(/^#\s+.+\n+/, '').trim()

        if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

        const isBlog = platform === 'blog'
        const html = isBlog ? mdToHtml(body) : body

        const { data: item, error: insErr } = await db.from('content_items').insert({
          workspace_id: workspaceId,
          type: isBlog ? 'blog' : `${platform}_post`,
          // content_items.platform uses the content vocabulary ('blog','linkedin',…),
          // NOT the connection vocabulary ('wordpress'). The connection lookup at
          // publish time uses replyMeta.platform (cfg.publishPlatform) instead.
          platform,
          title,
          content: body,
          content_html: isBlog ? html : null,
          metadata: { slug, ...(metaDescription ? { metaDescription } : {}) } as unknown as import('@/types/database.types').Json,
          status: 'draft',
        }).select('id').single()

        if (insErr || !item) { replyContent = `I couldn't stage that for publishing: ${insErr?.message || 'unknown error'}`; break }

        const words = body.split(/\s+/).filter(Boolean).length
        replyContent = `Got it — I've staged **"${title}"** (${words} words) to publish to ${cfg.publishPlatform}${metaDescription ? ' with your SEO meta description' : ''}. This will go **live** on your site. Confirm and I'll publish it — reply "yes, publish it".`
        replyMeta = { content_item_id: item.id, platform: cfg.publishPlatform, awaiting_publish_confirmation: true }
        break
      }

      // ── Publish (only when confirmed against a real pending draft) ──
      case 'publish': {
        if (!pendingDraft) { replyContent = `I don't have a draft waiting for your go-ahead right now. Want me to write one first?`; break }
        const res = await fetch(`${origin}/api/v1/publish`, {
          method: 'POST', headers,
          body: JSON.stringify({ content_item_id: pendingDraft.content_item_id, platform: pendingDraft.platform }),
        })
        const data = await res.json()
        if (data.success) {
          replyContent = `Done — it's live on ${pendingDraft.platform}.\n${data.data.platform_post_url || ''}`
          replyMeta = { published: true }
        } else {
          replyContent = `Publishing to ${pendingDraft.platform} failed: ${data.error?.message || 'unknown error'}. Want me to retry?`
          replyMeta = { publish_failed: true }
        }
        break
      }

      // ── Status check (truthful, from DB) ──
      case 'check_status': {
        const platform = plan_.params.platform ? String(plan_.params.platform) : (spec.defaultPlatform ? PLATFORM_CONFIG[spec.defaultPlatform as ContentPlatform]?.publishPlatform : null)
        // Latest research?
        if (spec.primaryTool === 'research' || /research/i.test(message)) {
          const { data: rs } = await db.from('research_sessions').select('title,status').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).single()
          if (rs) { replyContent = rs.status === 'completed' ? `Yes — research on "${rs.title}" is done. Check the Research section for the full brief.` : `Still running — research on "${rs.title}" is ${rs.status}. Give it a moment.`; break }
        }
        if (!platform) { replyContent = `Nothing's been queued to publish from me yet. Want me to draft something?`; break }
        const { data: item } = await db.from('content_items').select('id,title,status').eq('workspace_id', workspaceId).eq('platform', platform).order('created_at', { ascending: false }).limit(1).single()
        if (!item) { replyContent = `I haven't drafted anything for ${platform} yet. Want me to?`; break }
        const { data: attempt } = await db.from('publish_attempts').select('status,platform_post_url,error_message').eq('content_item_id', item.id).order('created_at', { ascending: false }).limit(1).single()
        if (attempt?.status === 'published') replyContent = `Yes — "${item.title}" is live on ${platform}.\n${attempt.platform_post_url || ''}`
        else if (attempt?.status === 'failed') replyContent = `No — publishing "${item.title}" failed: ${attempt.error_message || 'unknown error'}.`
        else replyContent = `Not yet — "${item.title}" is still a draft. Want me to post it?`
        break
      }

      // ── Save to knowledge base ──
      case 'save_knowledge': {
        // Must be a value allowed by the knowledge_items type CHECK constraint —
        // 'general'/'service_offer' are NOT valid and would 500 on insert.
        const ALLOWED_KNOWLEDGE_TYPES = ['brand_voice', 'business_info', 'audience_persona', 'offer', 'service', 'writing_preference', 'case_study', 'testimonial', 'custom']
        const rawType = String(plan_.params.type || 'custom')
        const type = ALLOWED_KNOWLEDGE_TYPES.includes(rawType) ? rawType : 'custom'
        const title = String(plan_.params.title || 'Note')
        const content = String(plan_.params.content || message)
        const res = await fetch(`${origin}/api/v1/brain`, { method: 'POST', headers, body: JSON.stringify({ type, title, content }) })
        const data = await res.json()
        replyContent = data.success ? `Saved to the knowledge base — "${title}". Every teammate will use this from now on.` : `Couldn't save that: ${data.error?.message}`
        break
      }

      // ── Trends ──
      case 'scan_trends': {
        const industry = String(plan_.params.industry || 'business consulting')
        const res = await fetch(`${origin}/api/v1/trends`, { method: 'POST', headers, body: JSON.stringify({ industry }) })
        const data = await res.json()
        if (!data.success) { replyContent = `Trend scan hit an issue: ${data.error?.message}`; break }
        const d = data.data
        replyContent = `Trend scan for **${industry}** — ${d.signals_found || 0} signals.\n\n${(d.trending_topics || []).slice(0,5).map((t: {topic:string;content_opportunity:string}) => `• **${t.topic}** — ${t.content_opportunity}`).join('\n') || 'No strong signals right now.'}`
        break
      }

      // ── Analytics (real content-output metrics; honest about engagement gap) ──
      case 'analytics': {
        const res = await fetch(`${origin}/api/v1/analytics?days=30`, { headers })
        const data = await res.json()
        if (!data.success) { replyContent = `I couldn't pull the numbers: ${data.error?.message}`; break }
        const a = data.data
        const t = a.totals || {}
        const platforms = Object.entries(a.by_platform || {})
          .map(([p, v]: [string, unknown]) => { const s = v as { published: number; total: number }; return `• ${p}: ${s.published} published / ${s.total} created` })
          .join('\n')
        if (!t.generated) {
          replyContent = `No content produced in the last 30 days yet — nothing to measure. Once your team starts publishing, I'll track output, velocity, and platform breakdown here.`
          break
        }
        replyContent = `**Last 30 days**\n• ${t.generated} pieces created, ${t.published} published\n• ${t.words_written?.toLocaleString?.() || t.words_written} words · ~${t.pieces_per_day}/day\n\n**By platform**\n${platforms || '—'}\n\nNote: these are production/output metrics. Live engagement (impressions, clicks, likes) needs platform analytics access, which we haven't connected yet — want me to flag that as the next thing to wire up?`
        break
      }

      // ── Humanize ──
      case 'humanize': {
        const content = String(plan_.params.content || message)
        const res = await fetch(`${origin}/api/v1/humanize`, { method: 'POST', headers, body: JSON.stringify({ content, auto_rewrite: true }) })
        const data = await res.json()
        if (!data.success) { replyContent = `Couldn't run the check: ${data.error?.message}`; break }
        const d = data.data
        replyContent = d.rewrite_applied ? `Cleaned it up:\n\n${d.humanized_content}` : `This reads well — no rewrite needed.`
        break
      }

      // ── Email: read ──
      case 'check_email': {
        const q = plan_.params.query ? `?q=${encodeURIComponent(String(plan_.params.query))}&limit=5` : '?limit=5'
        const res = await fetch(`${origin}/api/v1/gmail/threads${q}`, { headers })
        const data = await res.json()
        if (!data.success) { replyContent = `I couldn't reach the inbox: ${data.error?.message}. Make sure Google is connected for this workspace.`; break }
        const threads = data.data || []
        replyContent = threads.length
          ? `Here are your latest ${threads.length} threads:\n\n${threads.map((t: {subject:string;from:string;snippet:string}) => `• **${t.subject}** — ${t.from}\n  ${t.snippet?.slice(0,80)}`).join('\n\n')}`
          : `Your inbox is clear — no recent threads.`
        break
      }

      // ── Email: send (only on explicit confirm) ──
      case 'send_email': {
        const to = String(plan_.params.to || '')
        const subject = String(plan_.params.subject || '')
        const bodyText = String(plan_.params.body || '')
        if (!to || !subject || !bodyText) { replyContent = `I need a recipient, subject, and body before I send. Want me to draft it first for your approval?`; break }
        const res = await fetch(`${origin}/api/v1/gmail/send`, { method: 'POST', headers, body: JSON.stringify({ to, subject, html_body: `<p>${bodyText.replace(/\n/g,'<br/>')}</p>` }) })
        const data = await res.json()
        replyContent = data.success ? `Sent to ${to}.` : `Send failed: ${data.error?.message}`
        break
      }

      // ── Delete last draft ──
      case 'delete_last': {
        const md = [...history].reverse().find(m => m.metadata?.content_item_id)?.metadata
        const id = md?.content_item_id as string | undefined
        if (!id) { replyContent = `I don't see a recent draft to delete.`; break }
        const { data: item } = await db.from('content_items').select('status').eq('id', id).single()
        if (item?.status === 'published') { replyContent = `That one's already live — I can't unpublish it from here. You'd need to remove it on the platform directly.`; break }
        await db.from('content_items').delete().eq('id', id)
        replyContent = `Deleted that draft.`
        break
      }

      default: {
        replyContent = plan_.reply || `I'm not sure what you'd like me to do — could you rephrase?`
      }
    }

    // Persist assistant reply + bump conversation so ordering stays stable
    await saveMessage(conversation.id, workspaceId, 'assistant', replyContent, replyMeta)
    await db.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversation.id)

    return ok({ content: replyContent, metadata: replyMeta, action: plan_.action, conversation_id: conversation.id })
  } catch (error) {
    logger.error('Agent error', { error: String(error) })
    return Errors.internal(String(error))
  }
}

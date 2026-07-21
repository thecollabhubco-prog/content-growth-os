import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmployee } from '@/lib/employees'
import { logger } from '@/lib/logger'

// Employees that can actually publish somewhere, mapped to their platform_connections platform.
const EMPLOYEE_PLATFORM: Record<string, string> = {
  'sophia-chen': 'linkedin',
  'ryan-blake': 'x',
  'maya-patel': 'instagram',
  'james-harper': 'wordpress',
}

type HistoryMsg = { role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown> }

const INTENTS = ['casual', 'generate', 'status_check', 'confirm_publish', 'cancel_publish', 'delete_last'] as const
type Intent = typeof INTENTS[number]

async function classifyIntent(employeeName: string, role: string, message: string, lastAssistant?: HistoryMsg): Promise<Intent> {
  const awaitingConfirmation = !!lastAssistant?.metadata?.awaiting_publish_confirmation
  const hasLastDraft = !!lastAssistant?.metadata?.content_item_id

  const systemPrompt = `You classify the intent of a chat message sent to ${employeeName}, a ${role}.
Respond with ONLY strict JSON: {"intent": "<one of: casual, generate, status_check, confirm_publish, cancel_publish, delete_last>"}

Rules:
- "casual": small talk, greetings, questions about the assistant, or vague acknowledgement not asking for new content or a real action.
- "generate": asking to write/draft/create new content on a topic, or asking to revise/rewrite the last draft.
- "status_check": asking whether something was posted/published/sent already, or asking for the current state of a post ("did you post it?", "is it live?").
- "confirm_publish": a clear yes/go-ahead to publish a pending draft (only valid if a draft is awaiting confirmation).
- "cancel_publish": declining to publish a pending draft ("no", "don't post it", "cancel").
- "delete_last": asking to delete/remove the last draft.

Context: ${awaitingConfirmation ? 'There IS a draft currently awaiting publish confirmation.' : 'There is no draft awaiting confirmation right now.'} ${hasLastDraft ? 'A previous draft exists in this conversation.' : ''}`

  try {
    const result = await generate({
      systemPrompt,
      userPrompt: message,
      temperature: 0,
      // Reasoning-capable free models spend part of the budget on internal
      // reasoning before the final JSON — too small a budget truncates the
      // answer and silently falls through to the 'generate' default below.
      maxTokens: 150,
    })
    const match = result.content.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    const intent = parsed?.intent
    if (INTENTS.includes(intent)) return intent
  } catch (err) {
    logger.error('Intent classification failed, defaulting to generate', { error: String(err) })
  }
  return 'generate'
}

export async function POST(request: NextRequest) {
  try {
    const { origin } = new URL(request.url)
    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
    const body = await request.json()
    const { employeeId, message, history = [] } = body as { employeeId: string; message: string; history: HistoryMsg[] }

    if (!employeeId || !message) return Errors.validation('employeeId and message are required')

    const employee = getEmployee(employeeId)
    if (!employee) return Errors.notFound('Employee')

    const lastAssistant = [...history].reverse().find(m => m.role === 'assistant')
    const platform = EMPLOYEE_PLATFORM[employeeId]

    const intent = await classifyIntent(employee.defaultName, employee.role, message, lastAssistant)

    // ── Casual conversation — just chat, no content generation, no DB writes beyond the message itself ──
    if (intent === 'casual') {
      const recent = history.slice(-6).map(m => `${m.role === 'user' ? 'Aamish' : employee.defaultName}: ${m.content}`).join('\n')
      const systemPrompt = `You are ${employee.defaultName}, a ${employee.role} on Aamish's AI content team. ${employee.description}
You're having a normal conversation with Aamish, your boss. Reply naturally and briefly like a real teammate — not a content generator. Don't produce drafts or long-form content unless explicitly asked. It's fine to be warm, direct, and a little personable.`
      const result = await generate({ systemPrompt, userPrompt: `Recent conversation:\n${recent}\n\nAamish: ${message}`, temperature: 0.8, maxTokens: 300 })
      return ok({ intent, content: result.content, metadata: {} })
    }

    // ── Status check — answer truthfully from real DB state, never fabricate ──
    if (intent === 'status_check') {
      if (!platform) {
        return ok({ intent, content: `I don't publish directly to a platform myself — I just write drafts for you. Ask Lucas (Publishing Manager) about publishing status.`, metadata: {} })
      }
      const db = createAdminClient()
      const { data: item } = await db
        .from('content_items')
        .select('id, title, status, published_at, created_at')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!item) {
        return ok({ intent, content: `I haven't drafted anything for ${platform} yet in this workspace. Want me to write something?`, metadata: {} })
      }

      const { data: attempt } = await db
        .from('publish_attempts')
        .select('status, platform_post_url, error_message, published_at')
        .eq('content_item_id', item.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (attempt?.status === 'published') {
        return ok({ intent, content: `Yes — "${item.title}" is live on ${platform}.\n${attempt.platform_post_url || ''}`, metadata: {} })
      }
      if (attempt?.status === 'failed') {
        return ok({ intent, content: `No — publishing "${item.title}" to ${platform} failed: ${attempt.error_message || 'unknown error'}. Want me to retry?`, metadata: {} })
      }
      return ok({ intent, content: `Not yet — "${item.title}" is still a draft, nothing's been published. Want me to post it now?`, metadata: {} })
    }

    // ── Confirm publish — only fires if there's a real pending draft, always requires the prior explicit ask ──
    if (intent === 'confirm_publish') {
      const contentItemId = lastAssistant?.metadata?.content_item_id as string | undefined
      const awaiting = lastAssistant?.metadata?.awaiting_publish_confirmation
      if (!contentItemId || !awaiting || !platform) {
        return ok({ intent, content: `I don't have a draft waiting for your go-ahead right now. Want me to write one first?`, metadata: {} })
      }

      const publishRes = await fetch(`${origin}/api/v1/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({ content_item_id: contentItemId, platform }),
      })
      const publishData = await publishRes.json()

      if (publishData.success) {
        return ok({
          intent,
          content: `Posted it to ${platform}.\n${publishData.data.platform_post_url || ''}`,
          metadata: { published: true, content_item_id: contentItemId },
        })
      }
      return ok({
        intent,
        content: `Publishing to ${platform} failed: ${publishData.error?.message || 'unknown error'}`,
        metadata: { published: false, content_item_id: contentItemId },
      })
    }

    // ── Cancel publish ──
    if (intent === 'cancel_publish') {
      return ok({ intent, content: `Got it, I won't post that. Let me know if you want changes.`, metadata: {} })
    }

    // ── Delete last draft (unpublished only — we don't unpublish live posts via chat) ──
    if (intent === 'delete_last') {
      const contentItemId = lastAssistant?.metadata?.content_item_id as string | undefined
      if (!contentItemId) {
        return ok({ intent, content: `I don't see a recent draft to delete.`, metadata: {} })
      }
      const db = createAdminClient()
      const { data: item } = await db.from('content_items').select('status').eq('id', contentItemId).single()

      if (item?.status === 'published') {
        return ok({ intent, content: `That one's already published — I can't delete a live post from here yet. You'd need to remove it directly on the platform.`, metadata: {} })
      }
      await db.from('content_items').delete().eq('id', contentItemId)
      return ok({ intent, content: `Deleted that draft.`, metadata: {} })
    }

    // ── Fall through: let the client run its normal generation flow ──
    return ok({ intent: 'generate', content: null, metadata: {} })
  } catch (error) {
    logger.error('Chat respond error', { error: String(error) })
    return Errors.internal(String(error))
  }
}

import { buildSystemPrompt } from './shared'

const BASE = `You are an expert executive assistant. You read emails and extract exactly what matters.`

export function getEmailSummarizationPrompt(params: {
  subject: string
  from: string
  body: string
  threadContext?: string
}) {
  return `${BASE}

Summarize this email thread and extract action items.

FROM: ${params.from}
SUBJECT: ${params.subject}
${params.threadContext ? `THREAD CONTEXT:\n${params.threadContext}\n` : ''}
EMAIL BODY:
${params.body.slice(0, 3000)}

Return JSON:
{
  "summary": "2-3 sentence summary of what this email is about and what the sender wants",
  "action_items": [
    { "action": "...", "priority": "urgent|high|normal|low", "deadline": "..." }
  ],
  "category": "reply_needed|informational|meeting_request|invoice|newsletter|spam",
  "priority": "urgent|high|normal|low",
  "suggested_reply": "Draft reply if a response is needed, otherwise null",
  "key_info": ["important fact 1", "important fact 2"]
}`
}

export function getDraftEmailPrompt(params: {
  context: string
  originalEmail?: string
  purpose: string
  tone?: string
  length?: 'short' | 'medium' | 'long'
}) {
  return `${BASE}

Write an email based on the following context.

PURPOSE: ${params.purpose}
TONE: ${params.tone || 'professional and warm'}
LENGTH: ${params.length || 'medium'}
${params.originalEmail ? `ORIGINAL EMAIL TO REPLY TO:\n${params.originalEmail}\n` : ''}
CONTEXT: ${params.context}

Return JSON:
{
  "subject": "Email subject line",
  "body_html": "HTML email body",
  "body_text": "Plain text version"
}`
}

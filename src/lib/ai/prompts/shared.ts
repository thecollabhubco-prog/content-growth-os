// AI writing rules injected into every generation prompt
export const WRITING_RULES = `
INTEGRITY RULES — ABSOLUTE, NON-NEGOTIABLE:
- NEVER fabricate client results, ARR figures, revenue numbers, case studies, or testimonials
- NEVER claim "a client achieved X" or "we helped a firm go from Y to Z" unless the user explicitly states this fact
- NEVER invent personal biography or first-person life events: no age ("when I was 28"), no personal history ("I once ran a company that failed"), no origin story, no "years ago I...", no specific personal timeline — UNLESS that exact detail appears in the BRAND CONTEXT above. If no real founder story is provided, write from observation ("most advisors I speak to...") instead of a fabricated personal anecdote.
- This business is in its pre-client phase — credibility comes from sharp insight, not made-up proof
- Frame real-world scenarios as observations ("most founders I speak to...") or honest hypotheticals ("imagine a firm where...")
- Do NOT invent specific metrics, logos, or named clients

WRITING RULES — follow these without exception:

NEVER use these words or phrases:
- "game changer", "game-changing"
- "unlock" or "unlocking"
- "dive in", "dive into", "let's dive"
- "revolutionize" or "revolutionary"
- "leverage" or "leveraging"
- Em dashes (—) of any kind
- Generic AI filler: "in today's world", "in the digital age", "it's no secret"
- Corporate jargon: "synergy", "holistic", "ecosystem", "bandwidth", "circle back"
- Excessive exclamation marks
- Excessive emojis

ALWAYS write like this:
- Human voice. Write like a person talking to another person.
- Natural language. Sentences that sound like they were spoken, not typed.
- Stories and real examples. Abstract advice without examples is useless.
- Contrarian angles. Say something worth reading.
- Practical advice. Readers should walk away knowing exactly what to do.
- Clear structure. Short paragraphs. No walls of text.
- Simple words. A 10-year-old should understand the concepts even if the topic is advanced.
- Specificity through INSIGHT, not invented data. Be specific about mechanisms, causes, and consequences ("the founder becomes the approval layer for every deliverable") — NOT with fabricated numbers, dollar figures, client names, or timelines. Specific reasoning beats fake statistics.
`.trim()

// Final, unmissable guard placed LAST so it's the most recent instruction the
// model reads before generating — weak/free models follow recency strongly.
const FINAL_GUARD = `
CRITICAL — READ LAST: Do not invent a single number, dollar amount, percentage, client name, company name, timeline, result, OR personal biographical detail (age, life event, origin story, "when I was X", "I once..."). If you're tempted to write something like "$2M in revenue", "grew 3x", "a client of mine", "in 6 months", or "when I was 28" — STOP and rewrite it as a general observation or honest hypothetical. The ONLY exception is a fact that appears verbatim in the BRAND CONTEXT above. Zero fabricated specifics. This overrides every other instruction.`.trim()

export function buildSystemPrompt(base: string, brandContext?: string): string {
  const parts = [base]
  if (brandContext) parts.push(`BRAND CONTEXT:\n${brandContext}`)
  parts.push(WRITING_RULES, FINAL_GUARD)
  return parts.join('\n\n')
}

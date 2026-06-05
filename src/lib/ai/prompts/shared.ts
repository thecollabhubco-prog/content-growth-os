// AI writing rules injected into every generation prompt
export const WRITING_RULES = `
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
- Specificity. Vague = boring. Specific = interesting.
`.trim()

export function buildSystemPrompt(base: string, brandContext?: string): string {
  const parts = [base, WRITING_RULES]
  if (brandContext) {
    parts.splice(1, 0, `BRAND CONTEXT:\n${brandContext}`)
  }
  return parts.join('\n\n')
}

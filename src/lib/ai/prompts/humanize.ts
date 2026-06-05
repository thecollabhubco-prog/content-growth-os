export function getHumanizationAnalysisPrompt(content: string) {
  return `Analyze the following content for AI detection risk, readability, and quality issues.

CONTENT:
${content.slice(0, 4000)}

Return JSON:
{
  "ai_detection_score": 0.0-1.0,
  "readability_score": 0.0-1.0,
  "natural_language_score": 0.0-1.0,
  "writing_quality_score": 0.0-1.0,
  "repetition_score": 0.0-1.0,
  "overall_score": 0.0-1.0,
  "issues": [
    { "type": "ai_phrase|repetition|passive_voice|jargon|filler", "text": "...", "suggestion": "..." }
  ],
  "rewrite_required": true/false,
  "summary": "One sentence assessment"
}`
}

export function getHumanizationRewritePrompt(content: string, issues: object[]) {
  return `Rewrite the following content to sound more human, natural, and authentic.

ISSUES TO FIX:
${JSON.stringify(issues, null, 2)}

WRITING RULES:
- Remove all AI filler phrases ("it's worth noting", "in today's landscape", "it's important to remember")
- Remove em dashes — replace with commas or periods
- Vary sentence length — mix short punchy sentences with longer explanatory ones
- Add specific examples or observations where the original is vague
- Make transitions feel natural, not templated
- Sound like a real person talking, not a content generator

ORIGINAL CONTENT:
${content.slice(0, 4000)}

Return the rewritten content only. Do not include any commentary or explanation.`
}

export function getResearchBriefPrompt(params: {
  topic: string
  searchResults: string
  competitorData?: string
}) {
  return `You are a content strategist. Analyze the following research data and produce a comprehensive content brief.

TOPIC: ${params.topic}

SEARCH RESULTS:
${params.searchResults}

${params.competitorData ? `COMPETITOR DATA:\n${params.competitorData}` : ''}

Return JSON:
{
  "content_brief": "Full content brief in Markdown",
  "keyword_opportunities": [
    { "keyword": "...", "intent": "informational|commercial|transactional|navigational", "difficulty": "low|medium|high", "opportunity": "..." }
  ],
  "topic_clusters": [
    { "pillar": "Main pillar topic", "clusters": ["supporting topic 1", "supporting topic 2"] }
  ],
  "competitor_analysis": [
    { "angle": "What competitors cover", "gap": "What they miss" }
  ],
  "faq_opportunities": [
    { "question": "...", "answer_summary": "..." }
  ],
  "content_gaps": ["gap 1", "gap 2"],
  "recommended_formats": [
    { "format": "long-form blog|listicle|video|carousel|newsletter", "reason": "..." }
  ],
  "seo_opportunities": ["opportunity 1"],
  "geo_opportunities": ["opportunity 1"],
  "aeo_opportunities": ["opportunity 1"]
}`
}

export function getTrendAnalysisPrompt(signals: string) {
  return `Analyze these trend signals and predict content opportunities:

SIGNALS:
${signals}

Return JSON:
{
  "trending_topics": [
    { "topic": "...", "strength": 0.0-1.0, "direction": "rising|stable|declining", "predicted_peak_days": 0, "content_opportunity": "..." }
  ],
  "recommended_content": [
    { "title": "...", "platform": "...", "urgency": "now|this_week|this_month" }
  ]
}`
}

# Content Growth OS — Application Architecture

## System Overview

Content Growth OS is a production-grade AI-powered content platform built for content creation, repurposing, publishing, scheduling, research, and analytics across multiple channels.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   Next.js App Router  │  React Components  │  TypeScript        │
│   Tailwind CSS        │  Dark Mode         │  Mobile Responsive  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API LAYER (Next.js API Routes)             │
│   /api/v1/*           REST endpoints per module                 │
│   /api/webhooks/*     Incoming webhooks (n8n, publishing APIs)  │
│   /api/auth/*         Supabase Auth handlers                    │
└──────┬──────────────────────────────────────┬───────────────────┘
       │                                      │
┌──────▼──────────┐                ┌──────────▼───────────────────┐
│  SUPABASE        │                │  EXTERNAL SERVICES           │
│  PostgreSQL DB   │                │  OpenRouter (AI)             │
│  Auth            │                │  Tavily / Firecrawl / Jina   │
│  Vector Storage  │                │  WordPress / LinkedIn / X    │
│  Storage Buckets │                │  Meta / YouTube / Gmail      │
│  Row Level Sec.  │                │  n8n Automation              │
└──────────────────┘                └──────────────────────────────┘
```

---

## Module Architecture Map

| Module | Purpose | Key APIs |
|--------|---------|----------|
| 1. Knowledge Brain | Workspace memory & brand context | Supabase Vector, OpenRouter |
| 2. Research Engine | Topic, SEO, competitor research | Tavily, Firecrawl, Jina |
| 3. Source to Content | Multi-format content generation | OpenRouter |
| 4. Blog Engine | SEO blog generation + publishing | OpenRouter, WordPress API |
| 5. LinkedIn Engine | LinkedIn content + publishing | OpenRouter, LinkedIn API |
| 6. X Engine | X/Twitter content + publishing | OpenRouter, X API |
| 7. Instagram Engine | Instagram content + publishing | OpenRouter, Meta Graph API |
| 8. YouTube Engine | YouTube scripts + publishing | OpenRouter, YouTube Data API |
| 9. Newsletter Engine | Email campaigns | OpenRouter, Gmail API |
| 10. Repurposing Engine | Cross-platform content adaptation | OpenRouter |
| 11. Image Generation | AI image creation | OpenAI Images, Flux, Gemini |
| 12. Content Calendar | Scheduling & planning | Internal |
| 13. Publishing Engine | Unified multi-platform publishing | All publishing APIs |
| 14. Approval Engine | Review workflows | Internal |
| 15. Humanization Engine | AI detection + rewriting | OpenRouter |
| 16. AI Learning Engine | Performance-based learning | Supabase Analytics |
| 17. Trend Prediction | Trend monitoring + prediction | Tavily, Firecrawl |
| 18. Analytics Engine | Cross-platform analytics | All platform APIs |
| 19. Gmail / Google Workspace | Email + calendar + drive | Google APIs |

---

## Data Flow

### Content Creation Flow
```
User Input (topic/keyword/source)
  → Research Engine (Tavily + Firecrawl)
  → Knowledge Brain (context injection)
  → Content Generation (OpenRouter)
  → Humanization Engine (quality check)
  → Approval Engine (human or auto)
  → Publishing Engine (multi-platform)
  → Analytics Engine (track performance)
  → AI Learning Engine (update models)
```

### Automated Workflow (n8n)
```
Trigger (schedule / webhook / event)
  → n8n Workflow
  → Content Growth OS API
  → AI Generation Pipeline
  → Approval Gate
  → Publishing
  → Analytics Tracking
```

---

## Authentication Architecture

- Supabase Auth (email/password + OAuth)
- Google OAuth for Gmail/Workspace integration
- JWT tokens with Row Level Security (RLS) on all tables
- Workspace-scoped data isolation
- Role-based access: Owner, Admin, Editor, Viewer

---

## AI Model Strategy

All AI calls route through OpenRouter to support:
- Claude (Anthropic) — default writing model
- GPT-4o (OpenAI) — fallback / image generation
- Gemini (Google) — multimodal tasks
- DeepSeek — cost-efficient tasks

Model selection is configurable per workspace and per task type.

---

## Vector Memory Architecture

- Supabase pgvector extension
- Embeddings generated via OpenRouter (text-embedding-3-small)
- Namespace: per workspace
- Collections: brand_voice, content_history, audience_personas, business_context
- Retrieval: top-k semantic search with MMR reranking
- Context injection: prepended to every AI generation prompt

---

## Publishing Architecture

Each platform has its own adapter class:
- `WordPressAdapter` — REST API v2
- `LinkedInAdapter` — LinkedIn API v2
- `XAdapter` — X API v2
- `InstagramAdapter` — Meta Graph API
- `YouTubeAdapter` — YouTube Data API v3
- `GmailAdapter` — Gmail API v1

All adapters implement `PublisherInterface`:
```typescript
interface PublisherInterface {
  publish(content: ContentPayload): Promise<PublishResult>
  schedule(content: ContentPayload, time: Date): Promise<ScheduleResult>
  draft(content: ContentPayload): Promise<DraftResult>
  getMetrics(postId: string): Promise<Metrics>
}
```

---

## n8n Automation Integration

n8n connects via:
- Webhook triggers (n8n → Content Growth OS API)
- HTTP Request nodes (Content Growth OS API → n8n)
- Schedule triggers for daily/weekly workflows

Core n8n workflows:
1. Daily trend monitoring
2. Scheduled content publishing
3. Performance data collection
4. AI learning data pipeline
5. Gmail inbox processing

---

## Security Architecture

- All API routes protected with Supabase JWT verification
- Row Level Security (RLS) on every Supabase table
- Workspace isolation enforced at DB level
- OAuth tokens encrypted with AES-256 before storage
- API keys stored in environment variables, never in DB
- Rate limiting on all public endpoints
- Audit logging for all publishing and AI actions
- CORS restricted to application domain

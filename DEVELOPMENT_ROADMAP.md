# Content Growth OS — Development Roadmap

## Phase 0: Foundation (Week 1-2)
**Goal:** Running app with auth, workspace, and database.

### Tasks
- [ ] Initialize Next.js 15 project with TypeScript + Tailwind
- [ ] Install and configure shadcn/ui
- [ ] Configure Supabase (create project, run schema migration)
- [ ] Implement Supabase Auth (email/password)
- [ ] Build auth pages: Login, Signup, Forgot Password
- [ ] Build workspace creation + onboarding flow
- [ ] Build workspace switcher
- [ ] Build main app shell: sidebar, topbar, mobile nav
- [ ] Implement dark mode (system + manual toggle)
- [ ] Set up Row Level Security policies
- [ ] Set up structured logging
- [ ] Set up API middleware (JWT validation, workspace check)
- [ ] Configure environment variables
- [ ] Set up error boundary + toast notifications

**Deliverable:** Working auth + workspace + dashboard shell

---

## Phase 1: Knowledge Brain (Week 3)
**Goal:** Workspace memory system with semantic search.

### Tasks
- [ ] Knowledge item CRUD UI + API
- [ ] Brand voice setup form
- [ ] Business information form
- [ ] Audience persona builder
- [ ] Writing samples uploader
- [ ] Enable pgvector on Supabase
- [ ] Embedding pipeline (OpenRouter → pgvector)
- [ ] Semantic search API + UI
- [ ] Context injection system for AI generation
- [ ] Prompt library UI + API

**Deliverable:** Workspace can store brand context + retrieve it semantically

---

## Phase 2: Research Engine (Week 4)
**Goal:** AI-powered content research from any source.

### Tasks
- [ ] Tavily API client
- [ ] Firecrawl API client
- [ ] Jina Reader API client
- [ ] Research session UI (topic/URL/PDF input)
- [ ] PDF text extraction
- [ ] YouTube URL content extraction
- [ ] Research pipeline orchestrator
- [ ] Content brief generator
- [ ] SEO/GEO/AEO opportunity analyzer
- [ ] Competitor analysis engine
- [ ] Topic cluster generator
- [ ] Research results display UI
- [ ] Export research as content brief

**Deliverable:** Enter topic/URL → get full content brief with SEO opportunities

---

## Phase 3: Content Generation Core (Week 5-6)
**Goal:** AI content generation for all platforms.

### Tasks
- [ ] OpenRouter client with model selection
- [ ] AI writing rules injected into all prompts (no "leverage", em dashes, etc.)
- [ ] Blog generation engine (full article with SEO structure)
- [ ] LinkedIn post + carousel generator
- [ ] X tweet + thread generator
- [ ] Instagram caption + carousel generator
- [ ] YouTube script + description generator
- [ ] Newsletter generator
- [ ] Content editor component (rich text)
- [ ] Version history system
- [ ] Content streaming (SSE)
- [ ] Source-to-content engine (repurpose any input)

**Deliverable:** Generate any content type from topic or source material

---

## Phase 4: Humanization Engine (Week 7)
**Goal:** Quality check and rewrite before publishing.

### Tasks
- [ ] AI detection scorer
- [ ] Readability analyzer
- [ ] Brand voice consistency checker
- [ ] Natural language quality scorer
- [ ] Repetition detector
- [ ] Auto-rewriter for low-scoring content
- [ ] Humanization results UI
- [ ] Inline score display in content editor

**Deliverable:** Every piece of content checked + humanized before publishing

---

## Phase 5: Image Generation (Week 8)
**Goal:** AI image creation for all platforms.

### Tasks
- [ ] OpenAI Images (DALL-E 3) integration
- [ ] Flux integration
- [ ] Gemini image generation
- [ ] Image generation form with style templates
- [ ] Brand-consistent image prompts using Knowledge Brain
- [ ] Supabase Storage for generated images
- [ ] Image gallery UI
- [ ] Link images to content items
- [ ] Auto-generate featured images for blog posts

**Deliverable:** Generate and manage images for any platform

---

## Phase 6: Publishing Engine (Week 9-10)
**Goal:** Multi-platform publishing from one dashboard.

### Tasks
- [ ] WordPress REST API adapter
- [ ] LinkedIn API v2 adapter
- [ ] X API v2 adapter
- [ ] Meta Graph API (Instagram) adapter
- [ ] YouTube Data API v3 adapter
- [ ] OAuth connection flow for each platform
- [ ] Encrypted credential storage
- [ ] Platform connections UI (connect/disconnect)
- [ ] Publish now / schedule / draft UI
- [ ] Publish attempt tracking
- [ ] Retry logic for failed publishes
- [ ] Bulk publishing UI

**Deliverable:** Publish any content to any connected platform

---

## Phase 7: Content Calendar (Week 11)
**Goal:** Visual content planning and scheduling.

### Tasks
- [ ] Monthly calendar view
- [ ] Weekly calendar view
- [ ] Daily queue view
- [ ] Drag-and-drop scheduling
- [ ] Platform filter
- [ ] Auto-schedule suggestions based on AI learning
- [ ] Calendar entry creation from content items
- [ ] Bulk schedule upload

**Deliverable:** Full visual content calendar with scheduling

---

## Phase 8: Approval Engine (Week 12)
**Goal:** Configurable review workflows.

### Tasks
- [ ] Manual approval queue UI
- [ ] Semi-automatic approval (approve once → schedule)
- [ ] Autonomous mode (auto-publish)
- [ ] Approval notifications
- [ ] Approval history log
- [ ] Per-platform approval mode settings
- [ ] Comment + feedback on content items

**Deliverable:** Flexible approval workflow for all content

---

## Phase 9: Gmail + Google Workspace (Week 13-15)
**Goal:** Full Gmail and Google Workspace integration.

### Tasks
- [ ] Google OAuth 2.0 flow
- [ ] Encrypted token storage + refresh management
- [ ] Gmail inbox sync + pagination
- [ ] Thread view + message rendering
- [ ] AI email summarization
- [ ] AI action item extraction
- [ ] Email priority classification
- [ ] AI draft generation
- [ ] Send + reply + forward
- [ ] Gmail search (natural language + query)
- [ ] Attachment processing (PDF, DOCX, XLSX)
- [ ] Google Calendar integration
- [ ] Google Drive integration
- [ ] Google Docs integration

**Deliverable:** Full AI-powered Gmail interface + Google Workspace integration

---

## Phase 10: Analytics Engine (Week 16)
**Goal:** Cross-platform performance tracking.

### Tasks
- [ ] LinkedIn analytics sync
- [ ] X analytics sync
- [ ] Instagram analytics sync
- [ ] YouTube analytics sync
- [ ] WordPress traffic integration
- [ ] Analytics dashboard UI
- [ ] Per-platform analytics pages
- [ ] Performance charts (Recharts)
- [ ] Top performing content table
- [ ] Analytics scheduled sync (n8n)

**Deliverable:** Unified analytics dashboard across all platforms

---

## Phase 11: AI Learning + Trend Engine (Week 17)
**Goal:** Continuous improvement from performance data.

### Tasks
- [ ] Best-performing content analyzer
- [ ] Learning insights generator
- [ ] Insights dashboard UI
- [ ] Trend monitoring pipeline (Tavily daily scan)
- [ ] Trend signal storage + scoring
- [ ] Trend opportunities UI
- [ ] Auto-suggest content based on trends + past performance
- [ ] n8n workflow: daily trend monitor
- [ ] n8n workflow: weekly learning digest

**Deliverable:** System learns from results and predicts future content opportunities

---

## Phase 12: n8n Automation (Week 18)
**Goal:** Autonomous AI workflows via n8n.

### Tasks
- [ ] n8n self-hosted setup or cloud
- [ ] Webhook integration (n8n ↔ Content Growth OS API)
- [ ] Daily trend monitor workflow
- [ ] Scheduled content publishing workflow
- [ ] Performance data collection workflow
- [ ] Gmail AI processing workflow
- [ ] AI learning pipeline workflow
- [ ] Full autonomous content workflow (topic → publish)

**Deliverable:** End-to-end automated content workflows

---

## Phase 13: Multi-User + SaaS Ready (Week 19-20)
**Goal:** Production-ready multi-tenant platform.

### Tasks
- [ ] Team invitations + role management
- [ ] Workspace settings + branding
- [ ] Usage limits per plan (free/starter/growth/enterprise)
- [ ] Audit log UI
- [ ] API key management
- [ ] Billing integration (Stripe) — optional
- [ ] Rate limiting enforcement
- [ ] Performance optimization (caching, query optimization)
- [ ] Load testing
- [ ] Security review

**Deliverable:** Production-grade multi-tenant SaaS platform

---

## Tech Decisions Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| UI Components | shadcn/ui | Customizable, accessible, dark mode |
| State Management | Zustand | Simple, performant |
| Data Fetching | TanStack Query | Caching, SSE support |
| Charts | Recharts | React-native, composable |
| Rich Text Editor | Tiptap | Headless, extensible |
| Form Validation | Zod + React Hook Form | Type-safe |
| Date Handling | date-fns | Tree-shakeable |
| Encryption | Node.js crypto (AES-256-GCM) | Native, no extra deps |
| Logging | Pino | Production-grade structured logging |
| Calendar UI | React Big Calendar or custom | Full calendar views |

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENROUTER_API_KEY=

# Research
TAVILY_API_KEY=
FIRECRAWL_API_KEY=
JINA_API_KEY=

# Image Generation
OPENAI_API_KEY=
FLUX_API_KEY=

# Publishing
WORDPRESS_API_URL=        # Per workspace (stored in DB)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# n8n
N8N_WEBHOOK_SECRET=
N8N_API_KEY=

# Encryption
ENCRYPTION_KEY=           # 32-byte hex string for AES-256

# App
NEXT_PUBLIC_APP_URL=
```

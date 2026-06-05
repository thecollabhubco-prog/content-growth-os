# Content Growth OS — Folder Structure

```
content-growth-os/
├── .env.local                          # Environment variables (never committed)
├── .env.example                        # Template for env vars
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── public/
│   ├── icons/
│   └── images/
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout (dark mode, fonts)
│   │   ├── page.tsx                    # Landing/marketing page
│   │   │
│   │   ├── (auth)/                     # Auth group (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── callback/page.tsx       # OAuth callback
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   ├── (app)/                      # Main app (with sidebar)
│   │   │   ├── layout.tsx              # App shell (sidebar + topbar)
│   │   │   │
│   │   │   ├── dashboard/page.tsx      # Main dashboard
│   │   │   │
│   │   │   ├── research/               # Module 2: Research Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── create/                 # Module 3: Source to Content
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── blog/                   # Module 4: Blog Engine
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Blog editor
│   │   │   │       └── seo/page.tsx
│   │   │   │
│   │   │   ├── linkedin/               # Module 5: LinkedIn Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── x/                      # Module 6: X Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── instagram/              # Module 7: Instagram Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── youtube/                # Module 8: YouTube Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── newsletter/             # Module 9: Newsletter Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── repurpose/              # Module 10: Repurposing Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── images/                 # Module 11: Image Generation
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── calendar/               # Module 12: Content Calendar
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── publishing/             # Module 13: Publishing Engine
│   │   │   │   ├── page.tsx
│   │   │   │   └── connections/page.tsx
│   │   │   │
│   │   │   ├── approvals/              # Module 14: Approval Engine
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── trends/                 # Module 17: Trend Prediction
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── analytics/              # Module 18: Analytics
│   │   │   │   ├── page.tsx
│   │   │   │   └── [platform]/page.tsx
│   │   │   │
│   │   │   ├── brain/                  # Module 1: Knowledge Brain
│   │   │   │   ├── page.tsx
│   │   │   │   └── [type]/page.tsx
│   │   │   │
│   │   │   ├── gmail/                  # Module 19: Gmail
│   │   │   │   ├── page.tsx            # Inbox
│   │   │   │   ├── [threadId]/page.tsx # Thread view
│   │   │   │   └── compose/page.tsx
│   │   │   │
│   │   │   ├── google/                 # Module 19: Google Workspace
│   │   │   │   ├── calendar/page.tsx
│   │   │   │   ├── drive/page.tsx
│   │   │   │   └── docs/page.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx            # General settings
│   │   │       ├── workspace/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── billing/page.tsx
│   │   │       ├── connections/page.tsx
│   │   │       └── api-keys/page.tsx
│   │   │
│   │   └── api/
│   │       ├── v1/
│   │       │   ├── workspaces/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/route.ts
│   │       │   │
│   │       │   ├── brain/
│   │       │   │   ├── route.ts          # CRUD knowledge items
│   │       │   │   ├── search/route.ts   # Semantic search
│   │       │   │   └── embed/route.ts    # Generate embeddings
│   │       │   │
│   │       │   ├── research/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/route.ts
│   │       │   │
│   │       │   ├── content/
│   │       │   │   ├── route.ts
│   │       │   │   ├── [id]/route.ts
│   │       │   │   └── [id]/versions/route.ts
│   │       │   │
│   │       │   ├── generate/
│   │       │   │   ├── blog/route.ts
│   │       │   │   ├── linkedin/route.ts
│   │       │   │   ├── x/route.ts
│   │       │   │   ├── instagram/route.ts
│   │       │   │   ├── youtube/route.ts
│   │       │   │   ├── newsletter/route.ts
│   │       │   │   ├── repurpose/route.ts
│   │       │   │   └── images/route.ts
│   │       │   │
│   │       │   ├── humanize/
│   │       │   │   └── route.ts
│   │       │   │
│   │       │   ├── publish/
│   │       │   │   ├── route.ts
│   │       │   │   └── [platform]/route.ts
│   │       │   │
│   │       │   ├── calendar/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/route.ts
│   │       │   │
│   │       │   ├── analytics/
│   │       │   │   ├── route.ts
│   │       │   │   └── sync/route.ts
│   │       │   │
│   │       │   ├── trends/
│   │       │   │   └── route.ts
│   │       │   │
│   │       │   ├── gmail/
│   │       │   │   ├── threads/route.ts
│   │       │   │   ├── threads/[id]/route.ts
│   │       │   │   ├── drafts/route.ts
│   │       │   │   ├── send/route.ts
│   │       │   │   ├── search/route.ts
│   │       │   │   └── summarize/route.ts
│   │       │   │
│   │       │   ├── google/
│   │       │   │   ├── calendar/route.ts
│   │       │   │   ├── drive/route.ts
│   │       │   │   └── docs/route.ts
│   │       │   │
│   │       │   └── connections/
│   │       │       ├── route.ts
│   │       │       └── [platform]/
│   │       │           ├── route.ts
│   │       │           └── callback/route.ts
│   │       │
│   │       ├── auth/
│   │       │   ├── callback/route.ts
│   │       │   └── google/callback/route.ts
│   │       │
│   │       └── webhooks/
│   │           ├── n8n/route.ts
│   │           └── publishing/route.ts
│   │
│   ├── components/
│   │   ├── ui/                         # Base UI components (shadcn/ui based)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── progress.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── workspace-switcher.tsx
│   │   │   └── mobile-nav.tsx
│   │   │
│   │   ├── content/
│   │   │   ├── content-editor.tsx      # Rich text editor
│   │   │   ├── content-card.tsx
│   │   │   ├── content-list.tsx
│   │   │   ├── platform-badge.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── approval-actions.tsx
│   │   │
│   │   ├── research/
│   │   │   ├── research-form.tsx
│   │   │   ├── research-results.tsx
│   │   │   ├── content-brief.tsx
│   │   │   └── keyword-clusters.tsx
│   │   │
│   │   ├── calendar/
│   │   │   ├── calendar-view.tsx
│   │   │   ├── calendar-month.tsx
│   │   │   ├── calendar-week.tsx
│   │   │   └── schedule-slot.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── metrics-card.tsx
│   │   │   ├── platform-chart.tsx
│   │   │   ├── performance-table.tsx
│   │   │   └── trend-indicator.tsx
│   │   │
│   │   ├── gmail/
│   │   │   ├── inbox-list.tsx
│   │   │   ├── thread-view.tsx
│   │   │   ├── compose-modal.tsx
│   │   │   ├── email-card.tsx
│   │   │   └── ai-summary.tsx
│   │   │
│   │   └── shared/
│   │       ├── ai-loading.tsx
│   │       ├── platform-icon.tsx
│   │       ├── file-upload.tsx
│   │       ├── url-input.tsx
│   │       └── copy-button.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server Supabase client
│   │   │   ├── admin.ts                # Admin client (service role)
│   │   │   └── middleware.ts           # Auth middleware
│   │   │
│   │   ├── ai/
│   │   │   ├── openrouter.ts           # OpenRouter client
│   │   │   ├── embeddings.ts           # Embedding generation
│   │   │   ├── context-builder.ts      # Knowledge context injection
│   │   │   ├── prompts/
│   │   │   │   ├── blog.ts
│   │   │   │   ├── linkedin.ts
│   │   │   │   ├── x.ts
│   │   │   │   ├── instagram.ts
│   │   │   │   ├── youtube.ts
│   │   │   │   ├── newsletter.ts
│   │   │   │   ├── research.ts
│   │   │   │   ├── humanize.ts
│   │   │   │   └── email.ts
│   │   │   └── models.ts               # Model configs
│   │   │
│   │   ├── research/
│   │   │   ├── tavily.ts               # Tavily client
│   │   │   ├── firecrawl.ts            # Firecrawl client
│   │   │   ├── jina.ts                 # Jina Reader client
│   │   │   └── research-pipeline.ts    # Orchestrates research
│   │   │
│   │   ├── publishing/
│   │   │   ├── interface.ts            # PublisherInterface
│   │   │   ├── wordpress.ts
│   │   │   ├── linkedin.ts
│   │   │   ├── x.ts
│   │   │   ├── instagram.ts
│   │   │   ├── youtube.ts
│   │   │   └── publisher-factory.ts
│   │   │
│   │   ├── google/
│   │   │   ├── oauth.ts                # Google OAuth flow
│   │   │   ├── gmail.ts                # Gmail API client
│   │   │   ├── calendar.ts             # Google Calendar client
│   │   │   ├── drive.ts                # Google Drive client
│   │   │   ├── docs.ts                 # Google Docs client
│   │   │   └── token-manager.ts        # OAuth token refresh
│   │   │
│   │   ├── images/
│   │   │   ├── openai-images.ts
│   │   │   ├── flux.ts
│   │   │   ├── gemini-images.ts
│   │   │   └── image-factory.ts
│   │   │
│   │   ├── humanization/
│   │   │   ├── detector.ts             # AI detection check
│   │   │   ├── rewriter.ts             # Content rewriter
│   │   │   └── scorer.ts               # Quality scorer
│   │   │
│   │   ├── encryption/
│   │   │   └── tokens.ts               # AES-256 token encryption
│   │   │
│   │   ├── logger/
│   │   │   └── index.ts                # Structured logging
│   │   │
│   │   └── utils/
│   │       ├── api.ts                  # API response helpers
│   │       ├── dates.ts
│   │       ├── slugify.ts
│   │       └── validators.ts
│   │
│   ├── hooks/
│   │   ├── use-workspace.ts
│   │   ├── use-content.ts
│   │   ├── use-research.ts
│   │   ├── use-publishing.ts
│   │   ├── use-analytics.ts
│   │   ├── use-gmail.ts
│   │   └── use-calendar.ts
│   │
│   ├── stores/
│   │   ├── workspace-store.ts          # Zustand workspace state
│   │   ├── content-store.ts
│   │   └── ui-store.ts
│   │
│   └── types/
│       ├── database.types.ts           # Generated from Supabase
│       ├── content.types.ts
│       ├── publishing.types.ts
│       ├── analytics.types.ts
│       ├── research.types.ts
│       └── google.types.ts
│
├── n8n/
│   └── workflows/
│       ├── daily-trend-monitor.json
│       ├── scheduled-publishing.json
│       ├── performance-collector.json
│       ├── gmail-processor.json
│       └── ai-learning-pipeline.json
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    ├── seed.sql
    └── functions/
        └── search-knowledge/index.ts   # Edge function for vector search
```

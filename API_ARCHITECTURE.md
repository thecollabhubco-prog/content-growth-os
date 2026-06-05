# Content Growth OS — API Architecture

## Overview

All API routes follow REST conventions under `/api/v1/`. Each route is protected by Supabase JWT authentication middleware. Workspace isolation is enforced at both the API layer and database layer (RLS).

---

## Authentication Middleware

Every `/api/v1/*` request passes through:

```typescript
// Middleware checks:
// 1. Supabase JWT validation
// 2. Extract workspace_id from header: X-Workspace-ID
// 3. Verify user is member of workspace
// 4. Attach user + workspace to request context
```

---

## API Routes Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/callback` | Supabase OAuth callback |
| GET | `/api/auth/google/callback` | Google OAuth callback |

---

### Workspaces
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/workspaces` | List user workspaces |
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/workspaces/:id` | Get workspace |
| PATCH | `/api/v1/workspaces/:id` | Update workspace |
| DELETE | `/api/v1/workspaces/:id` | Delete workspace |
| POST | `/api/v1/workspaces/:id/members` | Invite member |
| DELETE | `/api/v1/workspaces/:id/members/:userId` | Remove member |

---

### Knowledge Brain
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/brain` | List knowledge items |
| POST | `/api/v1/brain` | Create knowledge item + embed |
| GET | `/api/v1/brain/:id` | Get item |
| PATCH | `/api/v1/brain/:id` | Update item |
| DELETE | `/api/v1/brain/:id` | Delete item |
| POST | `/api/v1/brain/search` | Semantic search |
| POST | `/api/v1/brain/embed` | Re-embed item |

---

### Research Engine
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/research` | List research sessions |
| POST | `/api/v1/research` | Start research session |
| GET | `/api/v1/research/:id` | Get session + results |
| DELETE | `/api/v1/research/:id` | Delete session |

**POST /api/v1/research — Request Body:**
```json
{
  "title": "string",
  "input_type": "topic | keyword | url | youtube_url | pdf | transcript | text | article",
  "input_data": "string",
  "options": {
    "competitor_analysis": true,
    "seo_opportunities": true,
    "faq_opportunities": true,
    "content_gaps": true,
    "recommended_formats": true
  }
}
```

---

### Content (CRUD)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/content` | List content items (filterable) |
| POST | `/api/v1/content` | Create content item |
| GET | `/api/v1/content/:id` | Get content item |
| PATCH | `/api/v1/content/:id` | Update content item |
| DELETE | `/api/v1/content/:id` | Delete content item |
| GET | `/api/v1/content/:id/versions` | Get version history |
| POST | `/api/v1/content/:id/approve` | Approve content |
| POST | `/api/v1/content/:id/reject` | Reject content |

**GET /api/v1/content — Query Params:**
```
?platform=linkedin&status=draft&type=linkedin_post&page=1&limit=20
```

---

### Content Generation
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/generate/blog` | Generate blog post |
| POST | `/api/v1/generate/linkedin` | Generate LinkedIn content |
| POST | `/api/v1/generate/x` | Generate X content |
| POST | `/api/v1/generate/instagram` | Generate Instagram content |
| POST | `/api/v1/generate/youtube` | Generate YouTube content |
| POST | `/api/v1/generate/newsletter` | Generate newsletter |
| POST | `/api/v1/generate/repurpose` | Repurpose content |
| POST | `/api/v1/generate/images` | Generate images |

**All generation endpoints accept:**
```json
{
  "research_session_id": "uuid (optional)",
  "source_content_id": "uuid (optional)",
  "input": {
    "topic": "string",
    "keywords": ["string"],
    "tone": "string",
    "length": "short | medium | long",
    "additional_instructions": "string"
  },
  "model": "claude-3-5-sonnet | gpt-4o | gemini-pro (optional, uses workspace default)",
  "use_knowledge_brain": true,
  "output_formats": ["blog", "linkedin_post"] // for repurpose
}
```

**All generation endpoints return:**
```json
{
  "content_item_id": "uuid",
  "type": "blog",
  "content": "generated content",
  "metadata": {},
  "tokens_used": 1500,
  "model_used": "claude-3-5-sonnet"
}
```

**Streaming support:** Add `Accept: text/event-stream` header for SSE streaming.

---

### Humanization Engine
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/humanize` | Analyze + humanize content |

**Request:**
```json
{
  "content_item_id": "uuid",
  "auto_rewrite": true
}
```

---

### Publishing
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/connections` | List platform connections |
| POST | `/api/v1/connections/:platform` | Initiate OAuth |
| GET | `/api/v1/connections/:platform/callback` | OAuth callback |
| DELETE | `/api/v1/connections/:id` | Disconnect platform |
| POST | `/api/v1/publish` | Publish content |
| GET | `/api/v1/publish/:id` | Get publish attempt status |

**POST /api/v1/publish — Request:**
```json
{
  "content_item_id": "uuid",
  "platform": "wordpress | linkedin | x | instagram | youtube | gmail",
  "schedule_at": "ISO8601 datetime (optional, immediate if omitted)",
  "platform_params": {
    "categories": ["string"],
    "tags": ["string"]
  }
}
```

---

### Content Calendar
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/calendar` | Get calendar entries |
| POST | `/api/v1/calendar` | Create calendar entry |
| PATCH | `/api/v1/calendar/:id` | Update entry |
| DELETE | `/api/v1/calendar/:id` | Delete entry |

**GET /api/v1/calendar — Query Params:**
```
?start=2026-06-01&end=2026-06-30&platform=linkedin
```

---

### Analytics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/analytics` | Workspace analytics summary |
| GET | `/api/v1/analytics/:platform` | Platform-specific analytics |
| POST | `/api/v1/analytics/sync` | Trigger analytics sync |

---

### Trends
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/trends` | Get trend signals |
| POST | `/api/v1/trends/scan` | Trigger trend scan |

---

### Gmail
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/gmail/threads` | List threads (paginated) |
| GET | `/api/v1/gmail/threads/:id` | Get thread + messages |
| POST | `/api/v1/gmail/threads/:id/summarize` | AI summarize thread |
| POST | `/api/v1/gmail/drafts` | Create draft |
| PATCH | `/api/v1/gmail/drafts/:id` | Update draft |
| POST | `/api/v1/gmail/send` | Send email |
| GET | `/api/v1/gmail/search` | Search threads |

**GET /api/v1/gmail/threads — Query Params:**
```
?q=from:john@example.com&label=INBOX&unread=true&page_token=xxx&limit=20
```

---

### Google Workspace
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/google/calendar` | List calendar events |
| POST | `/api/v1/google/calendar` | Create event |
| PATCH | `/api/v1/google/calendar/:id` | Update event |
| DELETE | `/api/v1/google/calendar/:id` | Delete event |
| GET | `/api/v1/google/drive` | List drive files |
| POST | `/api/v1/google/drive/upload` | Upload to drive |
| GET | `/api/v1/google/docs/:id` | Get doc content |
| POST | `/api/v1/google/docs` | Create doc |

---

### Webhooks
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/n8n` | Receive n8n workflow data |
| POST | `/api/webhooks/publishing` | Platform publish callbacks |

---

## API Response Format

**Success:**
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have access to this workspace",
    "details": {}
  }
}
```

**Standard Error Codes:**
- `UNAUTHORIZED` — Missing or invalid JWT
- `FORBIDDEN` — Valid JWT but insufficient permissions
- `NOT_FOUND` — Resource not found
- `VALIDATION_ERROR` — Invalid request body
- `RATE_LIMITED` — Too many requests
- `AI_ERROR` — AI generation failed
- `PUBLISH_ERROR` — Publishing failed
- `EXTERNAL_API_ERROR` — External service error

---

## Rate Limiting

| Endpoint Category | Rate Limit |
|-------------------|------------|
| AI Generation | 20 req/min per workspace |
| Publishing | 30 req/min per workspace |
| Research | 10 req/min per workspace |
| Analytics Sync | 5 req/min per workspace |
| Gmail | 50 req/min per user |
| General CRUD | 100 req/min per user |

---

## Streaming

Generation endpoints support Server-Sent Events (SSE) for real-time streaming:

```
POST /api/v1/generate/blog
Accept: text/event-stream

→ event: chunk
   data: {"text": "partial content..."}

→ event: done
   data: {"content_item_id": "uuid", "tokens_used": 1500}

→ event: error
   data: {"message": "generation failed"}
```

-- ============================================================
-- Content Growth OS — Complete Database Schema
-- Supabase PostgreSQL + pgvector
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- WORKSPACES & USERS
-- ============================================================

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  industry TEXT,
  description TEXT,
  settings JSONB DEFAULT '{}',
  ai_model_preferences JSONB DEFAULT '{"default_model": "claude-3-5-sonnet", "writing_model": "claude-3-5-sonnet", "research_model": "gpt-4o", "image_model": "dall-e-3"}',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 1: KNOWLEDGE BRAIN
-- ============================================================

CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'brand_voice', 'writing_preference', 'business_info', 'service',
    'product', 'offer', 'case_study', 'testimonial', 'audience_persona',
    'brand_guideline', 'writing_sample', 'prompt_template', 'custom'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  embedding vector(1536),
  chunk_index INTEGER DEFAULT 0,
  chunk_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompt_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  category TEXT,
  platform TEXT,
  variables JSONB DEFAULT '[]',
  is_global BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 2: RESEARCH ENGINE
-- ============================================================

CREATE TABLE research_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  input_type TEXT CHECK (input_type IN ('topic', 'keyword', 'url', 'youtube_url', 'pdf', 'transcript', 'text', 'article')),
  input_data TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results JSONB DEFAULT '{}',
  content_brief TEXT,
  keyword_opportunities JSONB DEFAULT '[]',
  competitor_analysis JSONB DEFAULT '[]',
  topic_clusters JSONB DEFAULT '[]',
  faq_opportunities JSONB DEFAULT '[]',
  content_gaps JSONB DEFAULT '[]',
  recommended_formats JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 3-10: CONTENT ITEMS
-- ============================================================

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  research_session_id UUID REFERENCES research_sessions(id),
  parent_content_id UUID REFERENCES content_items(id),
  type TEXT NOT NULL CHECK (type IN (
    'blog', 'linkedin_post', 'linkedin_carousel', 'x_post', 'x_thread',
    'instagram_caption', 'instagram_carousel', 'instagram_reel',
    'newsletter', 'youtube_script', 'youtube_short', 'youtube_description',
    'email', 'image_prompt'
  )),
  platform TEXT CHECK (platform IN ('blog', 'linkedin', 'x', 'instagram', 'youtube', 'email', 'internal')),
  title TEXT,
  content TEXT,
  content_html TEXT,
  metadata JSONB DEFAULT '{}',
  seo_data JSONB DEFAULT '{}',
  ai_quality_score JSONB DEFAULT '{}',
  humanization_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'published', 'archived', 'failed')),
  approval_mode TEXT DEFAULT 'manual' CHECK (approval_mode IN ('manual', 'semi_auto', 'autonomous')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  model_used TEXT,
  generation_prompt TEXT,
  generation_tokens INTEGER,
  word_count INTEGER,
  reading_time_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  metadata JSONB DEFAULT '{}',
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 4: BLOG ENGINE
-- ============================================================

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  seo_title TEXT,
  geo_title TEXT,
  meta_description TEXT,
  url_slug TEXT,
  h1 TEXT,
  outline JSONB DEFAULT '[]',
  faq_section JSONB DEFAULT '[]',
  cta_section TEXT,
  internal_links JSONB DEFAULT '[]',
  external_links JSONB DEFAULT '[]',
  schema_markup JSONB DEFAULT '{}',
  featured_image_url TEXT,
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  reading_level TEXT,
  target_keyword TEXT,
  secondary_keywords TEXT[] DEFAULT '{}',
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 11: IMAGE GENERATION
-- ============================================================

CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id),
  type TEXT CHECK (type IN (
    'featured_image', 'infographic', 'carousel_slide', 'post_graphic',
    'quote_graphic', 'story_graphic', 'thumbnail', 'custom'
  )),
  platform TEXT,
  prompt TEXT NOT NULL,
  model_used TEXT NOT NULL,
  image_url TEXT,
  storage_path TEXT,
  width INTEGER,
  height INTEGER,
  style_template TEXT,
  generation_params JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 12: CONTENT CALENDAR
-- ============================================================

CREATE TABLE calendar_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id),
  title TEXT NOT NULL,
  platform TEXT,
  content_type TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  scheduled_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ready', 'approved', 'scheduled', 'published', 'failed', 'cancelled')),
  notes TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 13: PUBLISHING ENGINE
-- ============================================================

CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wordpress', 'linkedin', 'x', 'instagram', 'youtube', 'gmail')),
  account_name TEXT,
  account_id TEXT,
  account_url TEXT,
  credentials_encrypted JSONB NOT NULL DEFAULT '{}',
  scopes TEXT[] DEFAULT '{}',
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  connection_metadata JSONB DEFAULT '{}',
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, platform, account_id)
);

CREATE TABLE publish_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES platform_connections(id),
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'retrying')),
  platform_post_id TEXT,
  platform_post_url TEXT,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 15: HUMANIZATION ENGINE
-- ============================================================

CREATE TABLE humanization_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ai_detection_score FLOAT,
  readability_score FLOAT,
  brand_voice_score FLOAT,
  writing_quality_score FLOAT,
  natural_language_score FLOAT,
  repetition_score FLOAT,
  overall_score FLOAT,
  issues_found JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  rewrite_required BOOLEAN DEFAULT FALSE,
  original_content TEXT,
  humanized_content TEXT,
  humanization_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 16: AI LEARNING ENGINE
-- ============================================================

CREATE TABLE content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id),
  publish_attempt_id UUID REFERENCES publish_attempts(id),
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  metrics_date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  engagement_rate FLOAT,
  click_through_rate FLOAT,
  raw_metrics JSONB DEFAULT '{}',
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(publish_attempt_id, metrics_date)
);

CREATE TABLE learning_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  insight_type TEXT CHECK (insight_type IN (
    'best_topic', 'best_format', 'best_hook', 'best_posting_time',
    'best_structure', 'best_length', 'best_platform', 'trending_topic'
  )),
  platform TEXT,
  insight_data JSONB NOT NULL,
  confidence_score FLOAT,
  sample_size INTEGER,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 17: TREND PREDICTION ENGINE
-- ============================================================

CREATE TABLE trend_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('google_trends', 'reddit', 'competitor', 'news', 'social')),
  topic TEXT NOT NULL,
  signal_strength FLOAT,
  trend_direction TEXT CHECK (trend_direction IN ('rising', 'stable', 'declining')),
  predicted_peak_date DATE,
  content_opportunity TEXT,
  raw_data JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- MODULE 18: ANALYTICS ENGINE
-- ============================================================

CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, platform, snapshot_date)
);

-- ============================================================
-- MODULE 19: GMAIL / GOOGLE WORKSPACE
-- ============================================================

CREATE TABLE google_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  google_user_id TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(workspace_id, google_user_id)
);

CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  google_connection_id UUID NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  participants JSONB DEFAULT '[]',
  labels TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  has_attachment BOOLEAN DEFAULT FALSE,
  message_count INTEGER DEFAULT 1,
  ai_summary TEXT,
  ai_action_items JSONB DEFAULT '[]',
  ai_category TEXT,
  ai_priority TEXT CHECK (ai_priority IN ('urgent', 'high', 'normal', 'low')),
  last_message_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(google_connection_id, gmail_thread_id)
);

CREATE TABLE email_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  google_connection_id UUID NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES email_threads(id),
  gmail_draft_id TEXT,
  to_addresses TEXT[] DEFAULT '{}',
  cc_addresses TEXT[] DEFAULT '{}',
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  generation_context TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  google_connection_id UUID NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees JSONB DEFAULT '[]',
  status TEXT,
  conference_url TEXT,
  ai_summary TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(google_connection_id, google_event_id)
);

-- ============================================================
-- AUDIT & ACTIVITY LOGGING
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  trigger_type TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  n8n_execution_id TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Workspace indexes
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Knowledge Brain indexes
CREATE INDEX idx_knowledge_items_workspace ON knowledge_items(workspace_id);
CREATE INDEX idx_knowledge_items_type ON knowledge_items(workspace_id, type);
CREATE INDEX idx_knowledge_embeddings_workspace ON knowledge_embeddings(workspace_id);

-- Content indexes
CREATE INDEX idx_content_items_workspace ON content_items(workspace_id);
CREATE INDEX idx_content_items_type ON content_items(workspace_id, type);
CREATE INDEX idx_content_items_status ON content_items(workspace_id, status);
CREATE INDEX idx_content_items_platform ON content_items(workspace_id, platform);
CREATE INDEX idx_content_items_scheduled ON content_items(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_content_items_created ON content_items(workspace_id, created_at DESC);

-- Calendar indexes
CREATE INDEX idx_calendar_entries_workspace ON calendar_entries(workspace_id);
CREATE INDEX idx_calendar_entries_date ON calendar_entries(workspace_id, scheduled_date);

-- Publishing indexes
CREATE INDEX idx_platform_connections_workspace ON platform_connections(workspace_id);
CREATE INDEX idx_publish_attempts_content ON publish_attempts(content_item_id);
CREATE INDEX idx_publish_attempts_status ON publish_attempts(status) WHERE status = 'pending';

-- Analytics indexes
CREATE INDEX idx_content_performance_workspace ON content_performance(workspace_id);
CREATE INDEX idx_content_performance_date ON content_performance(workspace_id, metrics_date DESC);
CREATE INDEX idx_analytics_snapshots_workspace ON analytics_snapshots(workspace_id, platform, snapshot_date DESC);

-- Google / Gmail indexes
CREATE INDEX idx_email_threads_workspace ON email_threads(workspace_id);
CREATE INDEX idx_email_threads_connection ON email_threads(google_connection_id);
CREATE INDEX idx_email_threads_priority ON email_threads(workspace_id, ai_priority) WHERE ai_priority IN ('urgent', 'high');
CREATE INDEX idx_calendar_events_time ON calendar_events(google_connection_id, start_time);

-- Audit indexes
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);

-- Vector similarity search index
CREATE INDEX idx_knowledge_embeddings_vector ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE humanization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Helper function: check workspace membership
CREATE OR REPLACE FUNCTION auth.user_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Example RLS policies (pattern applied to all workspace-scoped tables)
CREATE POLICY "workspace_members_access" ON workspace_members
  FOR ALL USING (workspace_id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "workspace_access" ON workspaces
  FOR ALL USING (id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "content_items_access" ON content_items
  FOR ALL USING (workspace_id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "knowledge_items_access" ON knowledge_items
  FOR ALL USING (workspace_id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "platform_connections_access" ON platform_connections
  FOR ALL USING (workspace_id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "google_connections_access" ON google_connections
  FOR ALL USING (workspace_id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "email_threads_access" ON email_threads
  FOR ALL USING (workspace_id IN (SELECT auth.user_workspace_ids()));

CREATE POLICY "user_profiles_own" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON platform_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_calendar_entries_updated_at BEFORE UPDATE ON calendar_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_email_drafts_updated_at BEFORE UPDATE ON email_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_knowledge_items_updated_at BEFORE UPDATE ON knowledge_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Semantic search function
CREATE OR REPLACE FUNCTION search_knowledge(
  p_workspace_id UUID,
  p_query_embedding vector(1536),
  p_match_count INTEGER DEFAULT 10,
  p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  knowledge_item_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  type TEXT,
  title TEXT,
  content TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.knowledge_item_id,
    ke.chunk_text,
    1 - (ke.embedding <=> p_query_embedding) AS similarity,
    ki.type,
    ki.title,
    ki.content
  FROM knowledge_embeddings ke
  JOIN knowledge_items ki ON ki.id = ke.knowledge_item_id
  WHERE
    ke.workspace_id = p_workspace_id
    AND ki.is_active = TRUE
    AND 1 - (ke.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY ke.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;

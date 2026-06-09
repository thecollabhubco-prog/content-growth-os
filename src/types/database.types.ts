export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          workspace_id: string
          employee_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          employee_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string | null
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          workspace_id: string
          role: 'user' | 'assistant'
          content: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          workspace_id: string
          role: 'user' | 'assistant'
          content: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          content?: string
          metadata?: Json
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          website_url: string | null
          industry: string | null
          description: string | null
          settings: Json
          ai_model_preferences: Json
          plan: 'free' | 'starter' | 'growth' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          website_url?: string | null
          industry?: string | null
          description?: string | null
          settings?: Json
          ai_model_preferences?: Json
          plan?: 'free' | 'starter' | 'growth' | 'enterprise'
        }
        Update: {
          name?: string
          slug?: string
          logo_url?: string | null
          website_url?: string | null
          industry?: string | null
          description?: string | null
          settings?: Json
          ai_model_preferences?: Json
          plan?: 'free' | 'starter' | 'growth' | 'enterprise'
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          invited_by?: string | null
        }
        Update: {
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          timezone: string
          notification_preferences: Json
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          timezone?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          timezone?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
        }
      }
      knowledge_items: {
        Row: {
          id: string
          workspace_id: string
          type: 'brand_voice' | 'writing_preference' | 'business_info' | 'service' | 'product' | 'offer' | 'case_study' | 'testimonial' | 'audience_persona' | 'brand_guideline' | 'writing_sample' | 'prompt_template' | 'custom'
          title: string
          content: string
          metadata: Json
          tags: string[]
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          type: 'brand_voice' | 'writing_preference' | 'business_info' | 'service' | 'product' | 'offer' | 'case_study' | 'testimonial' | 'audience_persona' | 'brand_guideline' | 'writing_sample' | 'prompt_template' | 'custom'
          title: string
          content: string
          metadata?: Json
          tags?: string[]
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          type?: string
          title?: string
          content?: string
          metadata?: Json
          tags?: string[]
          is_active?: boolean
        }
      }
      knowledge_embeddings: {
        Row: {
          id: string
          knowledge_item_id: string
          workspace_id: string
          embedding: number[] | null
          chunk_index: number
          chunk_text: string
          created_at: string
        }
        Insert: {
          id?: string
          knowledge_item_id: string
          workspace_id: string
          embedding?: number[] | string | null
          chunk_index?: number
          chunk_text: string
        }
        Update: {
          embedding?: number[] | string | null
          chunk_text?: string
        }
      }
      research_sessions: {
        Row: {
          id: string
          workspace_id: string
          title: string
          input_type: string | null
          input_data: string | null
          status: 'pending' | 'running' | 'completed' | 'failed'
          results: Json
          content_brief: string | null
          keyword_opportunities: Json
          competitor_analysis: Json
          topic_clusters: Json
          faq_opportunities: Json
          content_gaps: Json
          recommended_formats: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          input_type?: string | null
          input_data?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          results?: Json
          content_brief?: string | null
          keyword_opportunities?: Json
          competitor_analysis?: Json
          topic_clusters?: Json
          faq_opportunities?: Json
          content_gaps?: Json
          recommended_formats?: Json
          created_by?: string | null
        }
        Update: {
          title?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          results?: Json
          content_brief?: string | null
          keyword_opportunities?: Json
          competitor_analysis?: Json
          topic_clusters?: Json
          faq_opportunities?: Json
          content_gaps?: Json
          recommended_formats?: Json
        }
      }
      content_items: {
        Row: {
          id: string
          workspace_id: string
          research_session_id: string | null
          parent_content_id: string | null
          type: 'blog' | 'linkedin_post' | 'linkedin_carousel' | 'x_post' | 'x_thread' | 'instagram_caption' | 'instagram_carousel' | 'instagram_reel' | 'newsletter' | 'youtube_script' | 'youtube_short' | 'youtube_description' | 'email' | 'image_prompt'
          platform: 'blog' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'email' | 'internal' | null
          title: string | null
          content: string | null
          content_html: string | null
          metadata: Json
          seo_data: Json
          ai_quality_score: Json
          humanization_data: Json
          status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived' | 'failed'
          approval_mode: 'manual' | 'semi_auto' | 'autonomous'
          approved_by: string | null
          approved_at: string | null
          scheduled_at: string | null
          published_at: string | null
          model_used: string | null
          generation_prompt: string | null
          generation_tokens: number | null
          word_count: number | null
          reading_time_minutes: number | null
          tags: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          research_session_id?: string | null
          parent_content_id?: string | null
          type: 'blog' | 'linkedin_post' | 'linkedin_carousel' | 'x_post' | 'x_thread' | 'instagram_caption' | 'instagram_carousel' | 'instagram_reel' | 'newsletter' | 'youtube_script' | 'youtube_short' | 'youtube_description' | 'email' | 'image_prompt'
          platform?: 'blog' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'email' | 'internal' | null
          title?: string | null
          content?: string | null
          content_html?: string | null
          metadata?: Json
          seo_data?: Json
          ai_quality_score?: Json
          humanization_data?: Json
          status?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived' | 'failed'
          approval_mode?: 'manual' | 'semi_auto' | 'autonomous'
          approved_by?: string | null
          approved_at?: string | null
          scheduled_at?: string | null
          published_at?: string | null
          model_used?: string | null
          generation_prompt?: string | null
          generation_tokens?: number | null
          word_count?: number | null
          reading_time_minutes?: number | null
          tags?: string[]
          created_by?: string | null
        }
        Update: {
          title?: string | null
          content?: string | null
          content_html?: string | null
          metadata?: Json
          seo_data?: Json
          status?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived' | 'failed'
          approval_mode?: 'manual' | 'semi_auto' | 'autonomous'
          approved_by?: string | null
          approved_at?: string | null
          scheduled_at?: string | null
          published_at?: string | null
          tags?: string[]
        }
      }
      platform_connections: {
        Row: {
          id: string
          workspace_id: string
          platform: 'wordpress' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'gmail'
          account_name: string | null
          account_id: string | null
          account_url: string | null
          credentials_encrypted: Json
          scopes: string[]
          token_expires_at: string | null
          is_active: boolean
          last_sync_at: string | null
          connection_metadata: Json
          connected_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: 'wordpress' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'gmail'
          account_name?: string | null
          account_id?: string | null
          account_url?: string | null
          credentials_encrypted: Json
          scopes?: string[]
          token_expires_at?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          connection_metadata?: Json
          connected_by?: string | null
        }
        Update: {
          account_name?: string | null
          credentials_encrypted?: Json
          scopes?: string[]
          token_expires_at?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          connection_metadata?: Json
        }
      }
      publish_attempts: {
        Row: {
          id: string
          workspace_id: string
          content_item_id: string
          platform_connection_id: string | null
          platform: string
          status: 'pending' | 'publishing' | 'published' | 'failed' | 'retrying'
          platform_post_id: string | null
          platform_post_url: string | null
          published_at: string | null
          error_message: string | null
          retry_count: number
          request_payload: Json
          response_payload: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          content_item_id: string
          platform_connection_id?: string | null
          platform: string
          status?: 'pending' | 'publishing' | 'published' | 'failed' | 'retrying'
          platform_post_id?: string | null
          platform_post_url?: string | null
          published_at?: string | null
          error_message?: string | null
          retry_count?: number
          request_payload?: Json
          response_payload?: Json
        }
        Update: {
          status?: 'pending' | 'publishing' | 'published' | 'failed' | 'retrying'
          platform_post_id?: string | null
          platform_post_url?: string | null
          published_at?: string | null
          error_message?: string | null
          retry_count?: number
          response_payload?: Json
        }
      }
      calendar_entries: {
        Row: {
          id: string
          workspace_id: string
          content_item_id: string | null
          title: string
          platform: string | null
          content_type: string | null
          scheduled_date: string
          scheduled_time: string | null
          scheduled_at: string | null
          timezone: string
          status: 'planned' | 'ready' | 'approved' | 'scheduled' | 'published' | 'failed' | 'cancelled'
          notes: string | null
          color: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          content_item_id?: string | null
          title: string
          platform?: string | null
          content_type?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          scheduled_at?: string | null
          timezone?: string
          status?: 'planned' | 'ready' | 'approved' | 'scheduled' | 'published' | 'failed' | 'cancelled'
          notes?: string | null
          color?: string | null
          created_by?: string | null
        }
        Update: {
          title?: string
          platform?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          scheduled_at?: string | null
          status?: 'planned' | 'ready' | 'approved' | 'scheduled' | 'published' | 'failed' | 'cancelled'
          notes?: string | null
          color?: string | null
        }
      }
      content_performance: {
        Row: {
          id: string
          workspace_id: string
          content_item_id: string | null
          publish_attempt_id: string | null
          platform: string
          platform_post_id: string | null
          metrics_date: string
          impressions: number
          reach: number
          clicks: number
          likes: number
          comments: number
          shares: number
          saves: number
          watch_time_seconds: number
          engagement_rate: number | null
          click_through_rate: number | null
          raw_metrics: Json
          collected_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          content_item_id?: string | null
          publish_attempt_id?: string | null
          platform: string
          platform_post_id?: string | null
          metrics_date: string
          impressions?: number
          reach?: number
          clicks?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          watch_time_seconds?: number
          engagement_rate?: number | null
          click_through_rate?: number | null
          raw_metrics?: Json
        }
        Update: {
          impressions?: number
          reach?: number
          clicks?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          watch_time_seconds?: number
          engagement_rate?: number | null
          click_through_rate?: number | null
          raw_metrics?: Json
        }
      }
      trend_signals: {
        Row: {
          id: string
          workspace_id: string
          source: string | null
          topic: string
          signal_strength: number | null
          trend_direction: 'rising' | 'stable' | 'declining' | null
          predicted_peak_date: string | null
          content_opportunity: string | null
          raw_data: Json
          detected_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          source?: string | null
          topic: string
          signal_strength?: number | null
          trend_direction?: 'rising' | 'stable' | 'declining' | null
          predicted_peak_date?: string | null
          content_opportunity?: string | null
          raw_data?: Json
          expires_at?: string | null
        }
        Update: {
          signal_strength?: number | null
          trend_direction?: 'rising' | 'stable' | 'declining' | null
          predicted_peak_date?: string | null
          content_opportunity?: string | null
          expires_at?: string | null
        }
      }
      analytics_snapshots: {
        Row: {
          id: string
          workspace_id: string
          platform: string
          snapshot_date: string
          metrics: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: string
          snapshot_date: string
          metrics: Json
        }
        Update: {
          metrics?: Json
        }
      }
      google_connections: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          email: string
          google_user_id: string
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          scopes: string[]
          is_active: boolean
          connected_at: string
          last_sync_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          email: string
          google_user_id: string
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          is_active?: boolean
          last_sync_at?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          is_active?: boolean
          last_sync_at?: string | null
        }
      }
      email_threads: {
        Row: {
          id: string
          workspace_id: string
          google_connection_id: string
          gmail_thread_id: string
          subject: string | null
          snippet: string | null
          participants: Json
          labels: string[]
          is_read: boolean
          is_starred: boolean
          is_important: boolean
          has_attachment: boolean
          message_count: number
          ai_summary: string | null
          ai_action_items: Json
          ai_category: string | null
          ai_priority: 'urgent' | 'high' | 'normal' | 'low' | null
          last_message_at: string | null
          synced_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          google_connection_id: string
          gmail_thread_id: string
          subject?: string | null
          snippet?: string | null
          participants?: Json
          labels?: string[]
          is_read?: boolean
          is_starred?: boolean
          is_important?: boolean
          has_attachment?: boolean
          message_count?: number
          ai_summary?: string | null
          ai_action_items?: Json
          ai_category?: string | null
          ai_priority?: 'urgent' | 'high' | 'normal' | 'low' | null
          last_message_at?: string | null
        }
        Update: {
          subject?: string | null
          snippet?: string | null
          labels?: string[]
          is_read?: boolean
          is_starred?: boolean
          is_important?: boolean
          ai_summary?: string | null
          ai_action_items?: Json
          ai_category?: string | null
          ai_priority?: 'urgent' | 'high' | 'normal' | 'low' | null
          last_message_at?: string | null
          synced_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: Record<string, never>
      }
      automation_runs: {
        Row: {
          id: string
          workspace_id: string
          workflow_name: string
          trigger_type: string | null
          status: 'running' | 'completed' | 'failed' | 'cancelled'
          input_data: Json
          output_data: Json
          error_message: string | null
          steps_completed: number
          total_steps: number
          started_at: string
          completed_at: string | null
          n8n_execution_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          workflow_name: string
          trigger_type?: string | null
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          input_data?: Json
          output_data?: Json
          error_message?: string | null
          steps_completed?: number
          total_steps?: number
          n8n_execution_id?: string | null
        }
        Update: {
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          output_data?: Json
          error_message?: string | null
          steps_completed?: number
          completed_at?: string | null
        }
      }
      learning_insights: {
        Row: {
          id: string
          workspace_id: string
          insight_type: 'best_topic' | 'best_format' | 'best_hook' | 'best_posting_time' | 'best_structure' | 'best_length' | 'best_platform' | 'trending_topic'
          platform: string | null
          insight_data: Json
          confidence_score: number | null
          sample_size: number | null
          period_start: string | null
          period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          insight_type: 'best_topic' | 'best_format' | 'best_hook' | 'best_posting_time' | 'best_structure' | 'best_length' | 'best_platform' | 'trending_topic'
          platform?: string | null
          insight_data: Json
          confidence_score?: number | null
          sample_size?: number | null
          period_start?: string | null
          period_end?: string | null
        }
        Update: {
          insight_data?: Json
          confidence_score?: number | null
          sample_size?: number | null
        }
      }
    }
    Functions: {
      search_knowledge: {
        Args: {
          p_workspace_id: string
          p_query_embedding: number[]
          p_match_count?: number
          p_match_threshold?: number
        }
        Returns: {
          knowledge_item_id: string
          chunk_text: string
          similarity: number
          type: string
          title: string
          content: string
        }[]
      }
      user_workspace_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Workspace = Tables<'workspaces'>
export type WorkspaceMember = Tables<'workspace_members'>
export type UserProfile = Tables<'user_profiles'>
export type KnowledgeItem = Tables<'knowledge_items'>
export type ContentItem = Tables<'content_items'>
export type ResearchSession = Tables<'research_sessions'>
export type PlatformConnection = Tables<'platform_connections'>
export type PublishAttempt = Tables<'publish_attempts'>
export type CalendarEntry = Tables<'calendar_entries'>
export type ContentPerformance = Tables<'content_performance'>
export type TrendSignal = Tables<'trend_signals'>
export type EmailThread = Tables<'email_threads'>
export type GoogleConnection = Tables<'google_connections'>

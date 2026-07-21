// Central catalog describing what each employee specializes in and which
// generation endpoint + platform they default to. Every employee can use every
// tool, but this biases the planner toward their specialty and gives sensible
// defaults (e.g. Sophia → linkedin, James → blog/wordpress).

export type ToolName =
  | 'reply'
  | 'research'
  | 'generate_content'
  | 'publish'
  | 'check_status'
  | 'save_knowledge'
  | 'scan_trends'
  | 'humanize'
  | 'check_email'
  | 'send_email'
  | 'delete_last'

export type ContentPlatform =
  | 'blog'
  | 'linkedin'
  | 'x'
  | 'instagram'
  | 'youtube'
  | 'newsletter'

// platform → { generate endpoint, publish platform key (platform_connections.platform) }
export const PLATFORM_CONFIG: Record<ContentPlatform, {
  generatePath: string
  defaultFormat: string
  publishPlatform: string | null // null = can't be published via a connection yet (e.g. newsletter → gmail send)
  label: string
}> = {
  blog:       { generatePath: '/api/v1/generate/blog',       defaultFormat: 'standard',  publishPlatform: 'wordpress', label: 'blog article' },
  linkedin:   { generatePath: '/api/v1/generate/linkedin',   defaultFormat: 'post',      publishPlatform: 'linkedin',  label: 'LinkedIn post' },
  x:          { generatePath: '/api/v1/generate/x',          defaultFormat: 'post',      publishPlatform: 'x',         label: 'X post' },
  instagram:  { generatePath: '/api/v1/generate/instagram',  defaultFormat: 'caption',   publishPlatform: 'instagram', label: 'Instagram caption' },
  youtube:    { generatePath: '/api/v1/generate/youtube',    defaultFormat: 'long_form', publishPlatform: null,        label: 'YouTube script' },
  newsletter: { generatePath: '/api/v1/generate/newsletter', defaultFormat: 'weekly',    publishPlatform: null,        label: 'newsletter' },
}

// Per-employee specialty hints for the planner.
export const EMPLOYEE_SPECIALTY: Record<string, {
  specialty: string
  defaultPlatform?: ContentPlatform
  primaryTool: ToolName
}> = {
  'alex-morgan':    { specialty: 'deep research: topics, keywords, competitors, SEO/GEO opportunities, content briefs', primaryTool: 'research' },
  'james-harper':   { specialty: 'long-form SEO blog articles, ready to publish to WordPress', defaultPlatform: 'blog', primaryTool: 'generate_content' },
  'sophia-chen':    { specialty: 'LinkedIn posts and carousels, thought leadership', defaultPlatform: 'linkedin', primaryTool: 'generate_content' },
  'ryan-blake':     { specialty: 'X / Twitter tweets and threads', defaultPlatform: 'x', primaryTool: 'generate_content' },
  'maya-patel':     { specialty: 'Instagram captions, carousels, reel scripts', defaultPlatform: 'instagram', primaryTool: 'generate_content' },
  'ethan-cole':     { specialty: 'YouTube scripts, titles, descriptions', defaultPlatform: 'youtube', primaryTool: 'generate_content' },
  'olivia-rhodes':  { specialty: 'email newsletters and subject lines', defaultPlatform: 'newsletter', primaryTool: 'generate_content' },
  'noah-bennett':   { specialty: 'repurposing existing content across platforms', primaryTool: 'generate_content' },
  'zara-kim':       { specialty: 'visual/image generation for content', primaryTool: 'reply' },
  'lucas-wright':   { specialty: 'publishing and scheduling content across connected platforms', primaryTool: 'check_status' },
  'emma-davis':     { specialty: 'analytics and performance reporting', primaryTool: 'reply' },
  'kai-nakamura':   { specialty: 'trend intelligence and content opportunity spotting', primaryTool: 'scan_trends' },
  'grace-sterling': { specialty: 'brand voice, audience personas, and knowledge base management', primaryTool: 'save_knowledge' },
  'liam-foster':    { specialty: 'editing, AI-detection checking, and humanizing content', primaryTool: 'humanize' },
  'ava-mitchell':   { specialty: 'Gmail inbox management, email drafting, calendar', primaryTool: 'check_email' },
}

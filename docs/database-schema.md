# OmniWriter Database Schema

This document describes the database schema for OmniWriter, a professional AI-powered writing platform.

## Database Technology

- **Database:** SQLite 3
- **ORM/Driver:** better-sqlite3
- **Location:** `data/omniwriter.db` (configurable via `DATABASE_PATH` env variable)
- **Journal Mode:** WAL (Write-Ahead Logging) for better concurrent access

## Schema Overview

### Users and Authentication

#### `users`
Primary user table storing account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID |
| `email` | TEXT | UNIQUE NOT NULL | User email address |
| `password_hash` | TEXT | | Bcrypt hashed password (null for OAuth users) |
| `name` | TEXT | NOT NULL DEFAULT '' | Display name |
| `bio` | TEXT | DEFAULT '' | User biography |
| `avatar_url` | TEXT | DEFAULT '' | Profile picture URL |
| `role` | TEXT | CHECK IN ('free', 'premium', 'lifetime', 'admin') DEFAULT 'free' | User role |
| `subscription_status` | TEXT | DEFAULT 'active' | Subscription status |
| `subscription_expires_at` | TEXT | | Subscription expiry date |
| `preferred_language` | TEXT | CHECK IN ('it', 'en') DEFAULT 'it' | UI language |
| `theme_preference` | TEXT | CHECK IN ('light', 'dark') DEFAULT 'light' | UI theme |
| `google_id` | TEXT | UNIQUE | Google OAuth ID |
| `google_access_token` | TEXT | | Google OAuth access token |
| `google_refresh_token` | TEXT | | Google OAuth refresh token |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |
| `last_login_at` | TEXT | | Last login timestamp |

#### `sessions`
User session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Session UUID |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | User reference |
| `token` | TEXT | NOT NULL | Session token |
| `expires_at` | TEXT | NOT NULL | Expiry timestamp |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |

#### `password_reset_tokens`
Password reset token management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Token UUID |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | User reference |
| `token` | TEXT | NOT NULL | Reset token |
| `expires_at` | TEXT | NOT NULL | Expiry timestamp |
| `used` | INTEGER | NOT NULL DEFAULT 0 | Whether token was used |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |

### LLM Providers (AI Configuration)

#### `llm_providers`
Stores user AI provider configurations (OpenAI, Anthropic, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Provider config UUID |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `provider_type` | TEXT | NOT NULL CHECK IN ('openai', 'anthropic', 'google_gemini', 'open_router', 'requesty', 'custom') | Provider type |
| `display_name` | TEXT | NOT NULL | User-friendly name (e.g., "My OpenAI") |
| `api_key_encrypted` | TEXT | NOT NULL | **Encrypted** API key (AES-256-GCM) |
| `api_base_url` | TEXT | DEFAULT '' | Custom API base URL (for self-hosted) |
| `additional_config_json` | TEXT | DEFAULT '{}' | Extra config (headers, parameters) |
| `is_active` | INTEGER | NOT NULL DEFAULT 1 | Currently active provider (1=active, 0=inactive) |
| `connection_status` | TEXT | NOT NULL DEFAULT 'not_tested' CHECK IN ('not_tested', 'connected', 'failed') | Connection test status |
| `last_test_at` | TEXT | | Last connection test timestamp |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

**Security Note:** API keys are encrypted using AES-256-GCM before storage. The encryption key should be provided via the `ENCRYPTION_KEY` environment variable (32-byte hex string). See `server/src/utils/encryption.ts` for implementation details.

### User Preferences

#### `user_preferences`
User-specific settings and preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Preference UUID |
| `user_id` | TEXT | UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE | User reference |
| `default_ai_model` | TEXT | DEFAULT '' | Default AI model identifier |
| `default_quality_setting` | TEXT | NOT NULL DEFAULT 'balanced' CHECK IN ('speed', 'balanced', 'quality') | Quality vs speed preference |
| `dashboard_layout_json` | TEXT | DEFAULT '{}' | Custom dashboard layout |
| `keyboard_shortcuts_json` | TEXT | DEFAULT '{}' | Custom keyboard shortcuts |
| `selected_provider_id` | TEXT | REFERENCES llm_providers(id) ON DELETE SET NULL | Currently selected AI provider |
| `selected_model_id` | TEXT | DEFAULT '' | Selected model ID within provider |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

### Writing Projects

#### `sagas`
Saga/series grouping for related projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Saga UUID |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `title` | TEXT | NOT NULL | Saga title |
| `description` | TEXT | DEFAULT '' | Saga description |
| `area` | TEXT | NOT NULL CHECK IN ('romanziere', 'saggista', 'redattore') | Writing area |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

#### `projects`
Main project table for novels, essays, and articles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Project UUID |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `saga_id` | TEXT | REFERENCES sagas(id) ON DELETE SET NULL | Optional saga reference |
| `title` | TEXT | NOT NULL | Project title |
| `description` | TEXT | DEFAULT '' | Project description |
| `area` | TEXT | NOT NULL CHECK IN ('romanziere', 'saggista', 'redattore') | Writing area |
| `genre` | TEXT | DEFAULT '' | Genre |
| `tone` | TEXT | DEFAULT '' | Writing tone |
| `target_audience` | TEXT | DEFAULT '' | Target audience |
| `pov` | TEXT | DEFAULT '' | Point of view |
| `word_count_target` | INTEGER | DEFAULT 0 | Target word count |
| `status` | TEXT | NOT NULL DEFAULT 'draft' CHECK IN ('draft', 'in_progress', 'completed', 'archived') | Project status |
| `human_model_id` | TEXT | REFERENCES human_models(id) ON DELETE SET NULL | Associated Human Model |
| `settings_json` | TEXT | DEFAULT '{}' | Project-specific settings |
| `word_count` | INTEGER | DEFAULT 0 | Current word count |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

#### `chapters`
Chapter/content sections within projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Chapter UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Parent project |
| `title` | TEXT | NOT NULL | Chapter title |
| `content` | TEXT | DEFAULT '' | Chapter content (Markdown) |
| `order_index` | INTEGER | NOT NULL DEFAULT 0 | Sort order |
| `status` | TEXT | NOT NULL DEFAULT 'draft' CHECK IN ('draft', 'generated', 'revised', 'final') | Chapter status |
| `word_count` | INTEGER | DEFAULT 0 | Word count |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

#### `chapter_versions`
Version history for chapters.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Version UUID |
| `chapter_id` | TEXT | NOT NULL REFERENCES chapters(id) ON DELETE CASCADE | Parent chapter |
| `content` | TEXT | NOT NULL | Version content |
| `version_number` | INTEGER | NOT NULL | Version sequence number |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `change_description` | TEXT | DEFAULT '' | Description of changes |

#### `chapter_comments`
Comments/annotations on chapter text.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Comment UUID |
| `chapter_id` | TEXT | NOT NULL REFERENCES chapters(id) ON DELETE CASCADE | Parent chapter |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Comment author |
| `text` | TEXT | NOT NULL | Comment text |
| `start_pos` | INTEGER | NOT NULL | Start character position |
| `end_pos` | INTEGER | NOT NULL | End character position |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

### Story Elements (Romanziere)

#### `characters`
Character profiles for narrative projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Character UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Parent project |
| `saga_id` | TEXT | REFERENCES sagas(id) ON DELETE SET NULL | Optional saga reference |
| `name` | TEXT | NOT NULL | Character name |
| `description` | TEXT | DEFAULT '' | Physical/behavioral description |
| `traits` | TEXT | DEFAULT '' | Character traits |
| `backstory` | TEXT | DEFAULT '' | Character backstory |
| `role_in_story` | TEXT | DEFAULT '' | Role (protagonist, antagonist, etc.) |
| `relationships_json` | TEXT | DEFAULT '[]' | Relationships to other characters |
| `extracted_from_upload` | INTEGER | NOT NULL DEFAULT 0 | Auto-extracted from upload (1=yes) |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

#### `locations`
Location/place profiles for narrative projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Location UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Parent project |
| `saga_id` | TEXT | REFERENCES sagas(id) ON DELETE SET NULL | Optional saga reference |
| `name` | TEXT | NOT NULL | Location name |
| `description` | TEXT | DEFAULT '' | Location description |
| `significance` | TEXT | DEFAULT '' | Significance in story |
| `extracted_from_upload` | INTEGER | NOT NULL DEFAULT 0 | Auto-extracted from upload (1=yes) |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

#### `plot_events`
Plot events/timeline for narrative projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Event UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Parent project |
| `saga_id` | TEXT | REFERENCES sagas(id) ON DELETE SET NULL | Optional saga reference |
| `title` | TEXT | NOT NULL | Event title |
| `description` | TEXT | DEFAULT '' | Event description |
| `chapter_id` | TEXT | REFERENCES chapters(id) ON DELETE SET NULL | Associated chapter |
| `order_index` | INTEGER | NOT NULL DEFAULT 0 | Sort order |
| `event_type` | TEXT | DEFAULT '' | Event type classification |
| `extracted_from_upload` | INTEGER | NOT NULL DEFAULT 0 | Auto-extracted from upload (1=yes) |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

### Human Model (Style Training)

#### `human_models`
User-trained writing style models.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Model UUID |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `name` | TEXT | NOT NULL | Model name |
| `description` | TEXT | DEFAULT '' | Model description |
| `model_type` | TEXT | NOT NULL DEFAULT 'romanziere_advanced' CHECK IN ('romanziere_advanced', 'saggista_basic', 'redattore_basic') | Model type |
| `analysis_result_json` | TEXT | DEFAULT '{}' | Style analysis results |
| `total_word_count` | INTEGER | DEFAULT 0 | Total words analyzed |
| `training_status` | TEXT | NOT NULL DEFAULT 'pending' CHECK IN ('pending', 'analyzing', 'ready', 'failed') | Training status |
| `style_strength` | INTEGER | NOT NULL DEFAULT 50 CHECK (>=0 AND <=100) | Style influence strength |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

#### `human_model_sources`
Source documents for Human Model training.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Source UUID |
| `human_model_id` | TEXT | NOT NULL REFERENCES human_models(id) ON DELETE CASCADE | Parent model |
| `file_name` | TEXT | NOT NULL | Original filename |
| `file_path` | TEXT | NOT NULL | Server file path |
| `file_type` | TEXT | NOT NULL | MIME type |
| `word_count` | INTEGER | DEFAULT 0 | Word count |
| `uploaded_at` | TEXT | NOT NULL DEFAULT datetime('now') | Upload timestamp |

### Research and Sources

#### `sources`
Research sources for projects (uploads and web searches).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Source UUID |
| `project_id` | TEXT | REFERENCES projects(id) ON DELETE CASCADE | Associated project |
| `saga_id` | TEXT | REFERENCES sagas(id) ON DELETE SET NULL | Associated saga |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `file_name` | TEXT | NOT NULL | Filename or title |
| `file_path` | TEXT | DEFAULT '' | Server file path (if uploaded) |
| `file_type` | TEXT | NOT NULL | MIME type |
| `file_size` | INTEGER | DEFAULT 0 | File size in bytes |
| `content_text` | TEXT | DEFAULT '' | Extracted text content |
| `source_type` | TEXT | NOT NULL DEFAULT 'upload' CHECK IN ('upload', 'web_search') | Source type |
| `url` | TEXT | | URL (for web sources) |
| `tags_json` | TEXT | DEFAULT '[]' | Tags array |
| `relevance_score` | REAL | DEFAULT 0.0 | Relevance score |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |

#### `citations`
Citations/bibliography for projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Citation UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Parent project |
| `chapter_id` | TEXT | REFERENCES chapters(id) ON DELETE CASCADE | Specific chapter |
| `title` | TEXT | NOT NULL | Work title |
| `authors` | TEXT | DEFAULT '' | Authors |
| `publication_year` | TEXT | | Year of publication |
| `publisher` | TEXT | DEFAULT '' | Publisher |
| `url` | TEXT | DEFAULT '' | URL |
| `page_numbers` | TEXT | DEFAULT '' | Page numbers |
| `citation_type` | TEXT | NOT NULL DEFAULT 'book' CHECK IN ('book', 'journal', 'website', 'report', 'other') | Type |
| `notes` | TEXT | DEFAULT '' | Notes |
| `order_index` | INTEGER | NOT NULL DEFAULT 0 | Sort order |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT datetime('now') | Last update timestamp |

### AI Generation

#### `generation_logs`
Logs of AI generation requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Log UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Project reference |
| `chapter_id` | TEXT | REFERENCES chapters(id) ON DELETE SET NULL | Chapter reference |
| `model_used` | TEXT | NOT NULL DEFAULT '' | AI model identifier |
| `phase` | TEXT | NOT NULL DEFAULT 'writing' CHECK IN ('structure', 'writing', 'revision') | Generation phase |
| `tokens_input` | INTEGER | DEFAULT 0 | Input tokens |
| `tokens_output` | INTEGER | DEFAULT 0 | Output tokens |
| `duration_ms` | INTEGER | DEFAULT 0 | Duration in milliseconds |
| `status` | TEXT | NOT NULL DEFAULT 'started' CHECK IN ('started', 'completed', 'failed', 'cancelled') | Status |
| `error_message` | TEXT | | Error message if failed |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |

### Export

#### `export_history`
Export history for projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Export UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Project reference |
| `format` | TEXT | NOT NULL CHECK IN ('docx', 'epub', 'rtf', 'pdf', 'txt') | Export format |
| `file_path` | TEXT | NOT NULL DEFAULT '' | Generated file path |
| `epub_cover_url` | TEXT | | EPUB cover URL |
| `epub_metadata_json` | TEXT | | EPUB metadata |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |

### Utility Tables

#### `project_tags`
Tags for project categorization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Tag UUID |
| `project_id` | TEXT | NOT NULL REFERENCES projects(id) ON DELETE CASCADE | Project reference |
| `tag_name` | TEXT | NOT NULL | Tag name |

## Indexes

The following indexes are created for performance optimization:

| Index Name | Table | Column(s) | Purpose |
|------------|-------|-----------|---------|
| `idx_projects_user_id` | projects | user_id | User's projects lookup |
| `idx_projects_saga_id` | projects | saga_id | Saga's projects lookup |
| `idx_projects_area` | projects | area | Area filtering |
| `idx_projects_status` | projects | status | Status filtering |
| `idx_chapters_project_id` | chapters | project_id | Project's chapters |
| `idx_chapters_order` | chapters | project_id, order_index | Chapter ordering |
| `idx_characters_project_id` | characters | project_id | Project's characters |
| `idx_locations_project_id` | locations | project_id | Project's locations |
| `idx_plot_events_project_id` | plot_events | project_id | Project's events |
| `idx_sources_project_id` | sources | project_id | Project's sources |
| `idx_sources_user_id` | sources | user_id | User's sources |
| `idx_generation_logs_project_id` | generation_logs | project_id | Project's logs |
| `idx_project_tags_project_id` | project_tags | project_id | Project's tags |
| `idx_human_models_user_id` | human_models | user_id | User's models |
| `idx_sessions_user_id` | sessions | user_id | User's sessions |
| `idx_sessions_token` | sessions | token | Session lookup |
| `idx_password_reset_tokens_user_id` | password_reset_tokens | user_id | User's reset tokens |
| `idx_password_reset_tokens_token` | password_reset_tokens | token | Token lookup |
| `idx_citations_project_id` | citations | project_id | Project's citations |
| `idx_citations_chapter_id` | citations | chapter_id | Chapter's citations |
| `idx_chapter_comments_chapter_id` | chapter_comments | chapter_id | Chapter's comments |
| `idx_chapter_comments_user_id` | chapter_comments | user_id | User's comments |
| `idx_llm_providers_user_id` | llm_providers | user_id | User's providers |
| `idx_llm_providers_is_active` | llm_providers | is_active | Active providers |
| `idx_user_preferences_selected_provider_id` | user_preferences | selected_provider_id | Provider preference |

## Encryption

API keys stored in `llm_providers.api_key_encrypted` are encrypted using:

- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with SHA-512, 100,000 iterations
- **Salt:** Random 64-byte salt per encryption
- **IV:** Random 16-byte IV per encryption
- **Auth Tag:** 16-byte authentication tag for integrity

The encryption key should be set via the `ENCRYPTION_KEY` environment variable as a 64-character hex string (32 bytes). If not set, the system derives a key from `JWT_SECRET` (development only).

See `server/src/utils/encryption.ts` for implementation.

## Foreign Key Relationships

```
users
├── sessions (CASCADE)
├── password_reset_tokens (CASCADE)
├── sagas (CASCADE)
├── projects (CASCADE)
├── human_models (CASCADE)
│   └── human_model_sources (CASCADE)
├── sources (CASCADE)
├── user_preferences (CASCADE)
└── llm_providers (CASCADE)

sagas
├── projects (SET NULL)
├── characters (SET NULL)
├── locations (SET NULL)
├── plot_events (SET NULL)
└── sources (SET NULL)

projects
├── chapters (CASCADE)
│   ├── chapter_versions (CASCADE)
│   ├── chapter_comments (CASCADE)
│   └── plot_events (SET NULL)
├── characters (CASCADE)
├── locations (CASCADE)
├── plot_events (CASCADE)
├── sources (CASCADE)
├── citations (CASCADE)
├── generation_logs (CASCADE)
├── export_history (CASCADE)
└── project_tags (CASCADE)

human_models
└── projects (SET NULL)

llm_providers
└── user_preferences (SET NULL)
```

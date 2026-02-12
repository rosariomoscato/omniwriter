import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function initializeDatabase(): Database.Database {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/omniwriter.db');
  const dbDir = path.dirname(dbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log(`[Database] Connected to SQLite at ${dbPath}`);

  // Run migrations
  runMigrations(db);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

function runMigrations(db: Database.Database): void {
  console.log('[Database] Running migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL DEFAULT '',
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'free' CHECK(role IN ('free', 'premium', 'lifetime', 'admin')),
      subscription_status TEXT DEFAULT 'active',
      subscription_expires_at TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'it' CHECK(preferred_language IN ('it', 'en')),
      theme_preference TEXT NOT NULL DEFAULT 'light' CHECK(theme_preference IN ('light', 'dark')),
      google_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sagas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      area TEXT NOT NULL CHECK(area IN ('romanziere', 'saggista', 'redattore')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      saga_id TEXT REFERENCES sagas(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      area TEXT NOT NULL CHECK(area IN ('romanziere', 'saggista', 'redattore')),
      genre TEXT DEFAULT '',
      tone TEXT DEFAULT '',
      target_audience TEXT DEFAULT '',
      pov TEXT DEFAULT '',
      word_count_target INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'completed', 'archived')),
      human_model_id TEXT REFERENCES human_models(id) ON DELETE SET NULL,
      settings_json TEXT DEFAULT '{}',
      word_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'generated', 'revised', 'final')),
      word_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapter_versions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      change_description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      saga_id TEXT REFERENCES sagas(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      traits TEXT DEFAULT '',
      backstory TEXT DEFAULT '',
      role_in_story TEXT DEFAULT '',
      relationships_json TEXT DEFAULT '[]',
      extracted_from_upload INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      saga_id TEXT REFERENCES sagas(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      significance TEXT DEFAULT '',
      extracted_from_upload INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plot_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      saga_id TEXT REFERENCES sagas(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      event_type TEXT DEFAULT '',
      extracted_from_upload INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS human_models (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      model_type TEXT NOT NULL DEFAULT 'romanziere_advanced' CHECK(model_type IN ('romanziere_advanced', 'saggista_basic', 'redattore_basic')),
      analysis_result_json TEXT DEFAULT '{}',
      total_word_count INTEGER DEFAULT 0,
      training_status TEXT NOT NULL DEFAULT 'pending' CHECK(training_status IN ('pending', 'analyzing', 'ready', 'failed')),
      style_strength INTEGER NOT NULL DEFAULT 50 CHECK(style_strength >= 0 AND style_strength <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS human_model_sources (
      id TEXT PRIMARY KEY,
      human_model_id TEXT NOT NULL REFERENCES human_models(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      saga_id TEXT REFERENCES sagas(id) ON DELETE SET NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT DEFAULT '',
      file_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      content_text TEXT DEFAULT '',
      source_type TEXT NOT NULL DEFAULT 'upload' CHECK(source_type IN ('upload', 'web_search')),
      url TEXT,
      tags_json TEXT DEFAULT '[]',
      relevance_score REAL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generation_logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
      model_used TEXT NOT NULL DEFAULT '',
      phase TEXT NOT NULL DEFAULT 'writing' CHECK(phase IN ('structure', 'writing', 'revision')),
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'started' CHECK(status IN ('started', 'completed', 'failed', 'cancelled')),
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_tags (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      tag_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      authors TEXT DEFAULT '',
      publication_year TEXT,
      publisher TEXT DEFAULT '',
      url TEXT DEFAULT '',
      page_numbers TEXT DEFAULT '',
      citation_type TEXT NOT NULL DEFAULT 'book' CHECK(citation_type IN ('book', 'journal', 'website', 'report', 'other')),
      notes TEXT DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS export_history (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      format TEXT NOT NULL CHECK(format IN ('docx', 'epub', 'rtf', 'pdf', 'txt')),
      file_path TEXT NOT NULL DEFAULT '',
      epub_cover_url TEXT,
      epub_metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      default_ai_model TEXT DEFAULT '',
      default_quality_setting TEXT NOT NULL DEFAULT 'balanced' CHECK(default_quality_setting IN ('speed', 'balanced', 'quality')),
      dashboard_layout_json TEXT DEFAULT '{}',
      keyboard_shortcuts_json TEXT DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_saga_id ON projects(saga_id);
    CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(project_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
    CREATE INDEX IF NOT EXISTS idx_locations_project_id ON locations(project_id);
    CREATE INDEX IF NOT EXISTS idx_plot_events_project_id ON plot_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_sources_project_id ON sources(project_id);
    CREATE INDEX IF NOT EXISTS idx_sources_user_id ON sources(user_id);
    CREATE INDEX IF NOT EXISTS idx_generation_logs_project_id ON generation_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
    CREATE INDEX IF NOT EXISTS idx_human_models_user_id ON human_models(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_citations_project_id ON citations(project_id);
    CREATE INDEX IF NOT EXISTS idx_citations_chapter_id ON citations(chapter_id);
  `);

  console.log('[Database] Migrations completed successfully');
}

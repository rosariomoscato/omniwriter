-- Performance indexes for features #151 and #152
-- Add indexes on commonly searched and sorted columns

-- Index for search on title (Feature #152)
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title COLLATE NOCASE);

-- Index for sorting by updated_at (Feature #151 - default sort)
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Index for search on description (Feature #152)
CREATE INDEX IF NOT EXISTS idx_projects_description ON projects(description COLLATE NOCASE);

-- Composite index for user_id + updated_at (optimal for common query pattern)
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);

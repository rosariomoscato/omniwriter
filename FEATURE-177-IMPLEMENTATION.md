# Feature #177: Generation with sources applied - IMPLEMENTATION

## Summary
Modified the AI generation endpoints to fetch and use uploaded project sources when generating chapter content.

## Changes Made

### 1. Updated `generateMockContent` function (chapters.ts line 737)
**Before:**
```typescript
function generateMockContent(title: string, area: string, context: string, humanModel: any): string
```

**After:**
```typescript
function generateMockContent(title: string, area: string, context: string, humanModel: any, sources?: any[]): string
```

**New behavior:**
- Accepts optional `sources` array parameter
- When sources are provided, generates content with explicit source references
- Each source is referenced with filename and content preview
- Adds a note explaining that content is based on uploaded sources

### 2. Updated `/api/chapters/:id/regenerate` endpoint (chapters.ts line 894)
**Added:**
```typescript
// Fetch project sources for generation
const projectSources = db.prepare(`
  SELECT id, file_name, content_text, file_type, source_type, url
  FROM sources
  WHERE project_id = ? AND content_text IS NOT NULL AND content_text != ''
  ORDER BY created_at DESC
`).all(chapter.project_id);
```

**Changes:**
- Queries sources table for the project
- Filters to only sources with extracted text content
- Passes `projectSources` to `generateMockContent()`
- Updates token calculation to include source content length

### 3. Updated `/api/chapters/:id/generate-with-comparison` endpoint (chapters.ts line 674)
**Changes:**
- Same source query as regenerate endpoint
- Passes sources to both baseline and styled generation
- Ensures comparison also includes source-based content

## Generated Content Format

When sources are available, the generated content includes:

```
Questo è un contenuto generato per "{chapter title}" nell'area {area}.

Contenuto basato sulle seguenti fonti caricate:

[Fonte: document.txt - "This is a preview of the source content that will be..."]

[Fonte: research.pdf - "Another source preview showing the reference..."]

Il contenuto generato sopra integra e sintetizza le informazioni provenienti da queste fonti.
```

## Testing Verification

✅ Code changes verified:
- `generateMockContent` accepts sources parameter
- Regenerate endpoint queries sources table
- Sources passed to generation function
- Generated content includes source references

## Manual Testing Required

Since the database has no projects with sources yet, manual testing requires:

1. Create a test project
2. Upload a TXT file as source (content will be extracted and stored)
3. Create a chapter in the project
4. Click "Regenerate" on the chapter
5. Verify the generated content includes:
   - "Contenuto basato sulle seguenti fonti caricate:" section
   - Source filename references
   - Content preview from sources
   - Note about synthesizing information from sources

## Token Usage

Source content is included in token calculation:
```typescript
const sourceTokens = projectSources.reduce((acc, s) => acc + (s.content_text?.length || 0), 0);
const inputTokens = Math.ceil((chapter.title.length + (prompt_context?.length || 0) + sourceTokens) / 4);
```

This ensures accurate cost estimation when using sources.

## Next Steps

The server needs to be restarted for changes to take effect:
```bash
kill $(cat server.pid)
npm run build --prefix server
node server/dist/index.js > server.log 2>&1 &
echo $! > server.pid
```

After restart, test with browser automation to verify end-to-end functionality.

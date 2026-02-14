# Feature #225: Link Existing Sources to Projects - Test Plan

## Implementation Summary

This feature allows users to link standalone sources (uploaded from the main Sources page) to a specific project, enabling reuse of sources across multiple projects.

### Changes Made:

#### Backend (server/src/routes/sources.ts):
1. **NEW ENDPOINT**: `PUT /api/sources/:id/project`
   - Links a standalone source to a project
   - Validates source ownership and standalone status (project_id = NULL)
   - Validates project ownership
   - Updates source.project_id
   - Returns source with parsed tags array

#### Frontend API Service (client/src/services/api.ts):
2. **NEW METHOD**: `linkSourceToProject(sourceId, projectId)`
   - Calls PUT /api/sources/:id/project
   - Returns updated source with tags array

#### Frontend Project Detail Page (client/src/pages/ProjectDetail.tsx):
3. **NEW STATE VARIABLES**:
   - `showLinkSources`: Controls modal visibility
   - `selectedSourcesToLink`: Tracks selected sources in modal
   - `standaloneSources`: Holds list of available standalone sources
   - `loadingStandaloneSources`: Loading state for standalone sources

4. **NEW HANDLER**: `handleLinkSources()`
   - Iterates through selected sources
   - Calls API to link each source to project
   - Updates project sources list with linked sources
   - Shows success toast message

5. **NEW FUNCTION**: `loadStandaloneSources()`
   - Fetches all sources via `getAllSources()`
   - Filters to only standalone sources (project_id = NULL)
   - Parses tags for each source

6. **NEW USE EFFECT**: Loads standalone sources when modal opens
   ```typescript
   useEffect(() => {
     if (showLinkSources) {
       loadStandaloneSources();
     }
   }, [showLinkSources]);
   ```

7. **NEW UI COMPONENT**: Link Sources Modal
   - Purple-themed modal (matches "Collega Fonti" branding)
   - Lists all standalone sources with checkboxes
   - Multi-select functionality
   - Shows selected count
   - Confirm/Cancel buttons
   - Empty state when no standalone sources available

8. **NEW BUTTON**: "Link Sources" (Collega Fonti)
   - Added to Sources section header
   - Purple-themed with Network icon
   - Positioned before Web Search and Upload buttons
   - Opens the Link Sources modal

#### Translations (client/src/i18n/locales/):
9. **NEW TRANSLATION KEYS** (it.json & en.json):
   - `projectPage.sources.linkSources`: "Collega Fonti" / "Link Sources"
   - `projectPage.sources.linkModalTitle`: "Collega Fonti Esistenti" / "Link Existing Sources"
   - `projectPage.sources.linkModalDesc`: Description text
   - `projectPage.sources.noStandaloneSources`: Empty state message
   - `projectPage.sources.selectedCount`: "{count} selected" / "{count} selezionate"
   - `projectPage.sources.cancel`: "Cancel"
   - `projectPage.sources.confirm`: "Link Selected Sources" / "Collega Fonti Selezionate"
   - `projectPage.sources.linkSuccess`: Success message for single source
   - `projectPage.sources.linkMultipleSuccess`: Success message for multiple sources

---

## Manual Test Plan

### Prerequisites:
1. Server running on port 5000
2. Client running on port 3000
3. Logged in as a user with at least one project
4. At least one standalone source exists (project_id = NULL in sources table)

### Test Steps:

#### Step 1: Verify Standalone Sources Exist
```sql
-- Check database for standalone sources
SELECT id, file_name, project_id, user_id
FROM sources
WHERE project_id IS NULL;
```
**Expected**: Should return at least 1 source (or upload one from Sources page if none exist)

#### Step 2: Navigate to Project Detail Page
1. Go to Dashboard
2. Click on any project card
3. Verify "Fonti" (Sources) section is visible
4. Verify new "Collega Fonti" button is visible (purple, with Network icon)

**Expected**: Button should be visible in Sources section header

#### Step 3: Open Link Sources Modal
1. Click "Collega Fonti" button
2. Modal should appear with title "Collega Fonti Esistenti"
3. Verify standalone sources are listed (if any exist)
4. Verify loading state shows briefly while fetching

**Expected**:
- Modal opens
- Sources listed with file name, type, size, and tags
- Each source has checkbox
- Selected count appears when sources are selected

#### Step 4: Select and Link Sources
1. Click checkbox on 1-2 sources
2. Verify selected count updates
3. Click "Collega Fonti Selezionate" button
4. Wait for API call to complete
5. Verify modal closes
6. Verify success toast appears
7. Verify linked sources now appear in project's Sources list

**Expected**:
- Sources successfully linked
- Modal closes
- Toast message confirms success
- Linked sources visible in project Sources section
- Sources retain their tags

#### Step 5: Verify Tag Filtering Works with Linked Sources
1. If linked sources have tags, verify they appear in tag filter dropdown
2. Select a tag from filter
3. Verify only sources with that tag are shown
4. Verify linked sources are included in filter results

**Expected**:
- Tag filtering includes newly linked sources
- Filter count is accurate

#### Step 6: Verify Source Cannot Be Linked Twice
1. Try clicking "Collega Fonti" again
2. Verify previously linked source does NOT appear in modal
3. Verify only standalone sources are shown

**Expected**:
- Already-linked sources are filtered out
- Modal only shows sources with project_id = NULL

#### Step 7: Verify Permission Checks
**Test with different user's source** (if possible):
1. Try to link source that belongs to different user
2. Should get 404 error

**Expected**:
- API returns 404 "Source not found"
- Toast shows error message

#### Step 8: Verify Project Ownership Check
**Test with different user's project** (if possible):
1. Try to link source to project belonging to different user
2. Should get 404 error

**Expected**:
- API returns 404 "Project not found"
- Toast shows error message

#### Step 9: Verify Source Already Linked Error
1. Manually update database to set project_id on a source
2. Try to link same source again via UI
3. Should get 400 error

**Expected**:
- API returns 400 "Source is already linked to a project"
- Toast shows error message

#### Step 10: Verify Data Persistence
1. Link a source to project
2. Refresh browser page (F5)
3. Verify linked source still appears in project
4. Check database: `SELECT project_id FROM sources WHERE id = ?`
5. Verify project_id is correctly set
6. Restart server
7. Refresh page again
8. Verify source is still linked

**Expected**:
- Data persists across page refresh
- Data persists across server restart
- Database has correct project_id

---

## API Endpoint Specification

### PUT /api/sources/:id/project

**Purpose**: Link a standalone source to a project

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "projectId": "uuid-of-project"
}
```

**Success Response** (200):
```json
{
  "source": {
    "id": "source-uuid",
    "project_id": "project-uuid",
    "user_id": "user-uuid",
    "file_name": "document.pdf",
    "file_path": "/path/to/file",
    "file_type": "application/pdf",
    "file_size": 12345,
    "content_text": "...",
    "source_type": "upload",
    "url": null,
    "tags_json": "[\"tag1\",\"tag2\"]",
    "relevance_score": 0.0,
    "created_at": "2025-02-14T10:30:00.000Z",
    "tags": ["tag1", "tag2"]  // Parsed from tags_json
  }
}
```

**Error Responses**:
- 400: Project ID is required
- 400: Source is already linked to a project
- 401: Authentication required
- 404: Source not found
- 404: Project not found
- 500: Failed to link source to project

---

## Database Schema Verification

### Sources Table:
```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),  -- Can be NULL (standalone)
  saga_id TEXT REFERENCES sagas(id),       -- Can be NULL
  user_id TEXT NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  content_text TEXT,
  source_type TEXT,
  url TEXT,
  tags_json TEXT DEFAULT '[]',
  relevance_score REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Key Points**:
- `project_id` can be NULL (standalone sources)
- `project_id` can be set to link source to project
- `project_id` can only be set once (source already linked validation)

---

## Edge Cases Handled

1. **No standalone sources**: Modal shows empty state with helpful message
2. **No sources selected**: Confirm button is disabled
3. **Source already linked**: API returns 400, prevents duplicate linking
4. **Source belongs to different user**: API returns 404
5. **Project belongs to different user**: API returns 404
6. **Invalid source ID**: API returns 404
7. **Invalid project ID**: API returns 404
8. **Missing project_id in request**: API returns 400

---

## Success Criteria (All Should Pass):

✅ Backend endpoint `PUT /api/sources/:id/project` is created
✅ Frontend API service has `linkSourceToProject()` method
✅ "Link Sources" button appears in Project Sources section
✅ Modal opens and displays standalone sources
✅ Multi-select checkboxes work correctly
✅ Selected count updates as sources are selected
✅ Confirm button disabled when no sources selected
✅ API call successfully links sources to project
✅ Linked sources appear in project's Sources list
✅ Success toast appears with appropriate message
✅ Modal closes after successful linking
✅ Tag filtering works with newly linked sources
✅ Linked sources do not appear in modal for future linking
✅ Data persists across page refresh
✅ Data persists across server restart
✅ Error handling works for all edge cases
✅ Translations exist for both IT and EN
✅ UI styling is consistent (purple theme)

---

## Notes for Testing

- The purple color (#A855F7) was chosen to differentiate from Upload (blue) and Web Search (green)
- Multi-select allows efficient batch linking of multiple sources
- Sources retain all their tags when linked
- Once linked, sources cannot be linked again (prevents duplicates)
- The modal automatically filters out already-linked sources

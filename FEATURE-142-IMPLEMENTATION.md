# Feature #142: Concurrent Edit Warning - Implementation Plan

## Requirements
When a user edits the same chapter in multiple browser tabs:
1. Open same chapter in two tabs
2. Edit in tab 1 and save
3. Try saving in tab 2
4. Show conflict warning or merge option

## Implementation Strategy

### Backend Changes
**File: server/src/routes/chapters.ts**

1. Add `updated_at` check to PUT /api/chapters/:id:
   - Accept optional `expected_updated_at` from client
   - If provided, compare with current database value
   - If mismatch, return 409 Conflict with current data
   - Include current chapter data in response for merge

### Frontend Changes
**File: client/src/pages/ChapterEditor.tsx**

1. Store `updated_at` when chapter loads:
   - Add `loadedUpdatedAt` state
   - Set it when chapter is fetched

2. Send `updated_at` with save requests:
   - Include `expected_updated_at` in API call
   - Handle 409 Conflict response

3. Show conflict dialog:
   - Detect 409 response
   - Show modal with options:
     - "Overwrite" - Force save current content
     - "Discard" - Reload from server
     - "Show Diff" - Compare versions

4. Add conflict UI state:
   - `hasConflict` state
   - `conflictData` state
   - Conflict dialog component

## Testing Plan
1. Open chapter in tab 1
2. Open same chapter in tab 2
3. Edit content in tab 1, save
4. Edit content in tab 2, try save
5. Verify conflict warning appears
6. Test overwrite, discard, and show diff options

## Success Criteria
- 409 Conflict response returned on stale save
- Warning dialog shown to user
- User can choose between overwrite/discard/merge
- No data loss from concurrent edits

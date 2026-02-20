# Feature #304 Implementation: Use Continuity Context in AI Generation

## Overview

This implementation integrates saga continuity data into the AI chapter generation process for sequel projects. When generating content for a sequel, the AI now has access to:
- Cumulative synopsis from all previous episodes
- Character states (alive/dead/injured/missing) across the entire saga
- Events summary from all previous episodes
- Locations visited throughout the saga
- Timeline information

This ensures that the AI maintains narrative consistency and does not resurrect dead characters or contradict established events.

## Changes Made

### 1. New Helper Function: `fetchContinuityForProject()`

**File:** `server/src/routes/projects.ts`

**Location:** After router configuration (lines 48-180)

**Purpose:** Fetches and formats continuity data from the `saga_continuity` table for use in AI prompts.

**Key Features:**
- Queries `saga_continuity` table based on project's `saga_id` and `continuity_id`
- Parses JSON fields: `characters_state`, `events_summary`, `locations_visited`, `timeline_json`
- Formats data with visual indicators (🟢 alive, 🔴 dead, 🟡 injured, ⚪ missing, 📜 events, 📍 locations, ⏰ timeline, 📖 synopsis)
- Returns structured object with all continuity context
- Handles cases where no continuity data exists gracefully

**Interface:**
```typescript
interface ContinuityContext {
  cumulativeSynopsis: string;
  characterStates: string;
  eventsSummary: string;
  locationsVisited: string;
  timelineContext: string;
  hasContinuity: boolean;
  episodeCount: number;
}
```

**Export:** The function is exported for use in other modules (line 7273)

### 2. Updated: Sequel Chapter Outline Generation

**File:** `server/src/routes/projects.ts`

**Location:** Lines 1721-1728 (fetching continuity), Lines 1795-1867 (outline prompt)

**Changes:**
- Fetches continuity context before building outline prompt
- Adds cumulative synopsis to outline prompt
- Adds character states from continuity (more detailed than project characters)
- Adds events summary from continuity
- Adds locations visited from continuity
- Adds timeline context from continuity
- Includes warning about saga continuity requirements
- Logs continuity usage for debugging

**Example Output:**
```
⚠️ IMPORTANTE: Questo sequel fa parte di una saga con 3 episodi precedenti.
Mantieni la massima coerenza con tutti gli episodi precedenti...
```

### 3. Updated: Sequel Chapter Content Generation

**File:** `server/src/routes/projects.ts`

**Location:** Lines 2046-2104 (chapter generation in sequel-stream endpoint)

**Changes:**
- Fetches continuity context for each chapter being generated
- Adds all continuity fields to system prompt
- Includes explicit continuity instructions:
  - Maintain consistency with all previous episodes
  - Strictly respect character status (alive/dead/injured/missing)
  - DO NOT resurrect dead characters
  - Consider all past events when writing new events
  - Maintain consistency with locations already visited
  - Respect the established timeline
  - Continue character arcs naturally

**Example Prompt Addition:**
```
📋 SAGA CONTINUITY INSTRUCTIONS:
- This chapter is part of a saga with 3 previous episodes
- Maintain consistency with all previous episodes
- Strictly respect character status (alive/dead/injured/missing)
- DO NOT resurrect dead characters
- Consider all past events when writing new events
- Maintain consistency with locations already visited
- Respect the established timeline
- Continue character arcs naturally
```

### 4. Updated: Regular Chapter Generation (generate-stream)

**File:** `server/src/routes/chapters.ts`

**Changes:**
- Imported `fetchContinuityForProject` from projects module (line 14)
- Added continuity context fetching in generate-stream endpoint (lines 904-948)
- Includes all continuity data in system prompt when available
- Adds explicit continuity instructions

**Purpose:** Ensures that when generating chapters for sequel projects (not just during sequel creation), the AI respects saga continuity.

### 5. Updated: Chapter Regeneration (regenerate-stream)

**File:** `server/src/routes/chapters.ts`

**Location:** Lines 1833-1885

**Changes:**
- Added continuity context fetching
- Includes all continuity fields in system prompt
- Adds explicit continuity instructions

**Purpose:** When regenerating a chapter in a sequel, the AI maintains consistency with the entire saga.

## Data Flow

### Continuity Data Structure (from saga_continuity table)

```typescript
{
  id: string;
  saga_id: string;
  source_project_id: string;
  episode_number: number;
  characters_state: string; // JSON array of characters with status
  events_summary: string;   // JSON array of events
  cumulative_synopsis: string; // Full saga synopsis
  locations_visited: string; // JSON array of locations
  timeline_json: string;     // JSON array of timeline events
}
```

### Character State Format

Each character in `characters_state`:
```typescript
{
  name: string;
  status: 'alive' | 'dead' | 'injured' | 'missing';
  notes?: string;
  role?: string;
  description?: string;
}
```

## Prompt Structure

When continuity is available, the AI receives:

1. **Project metadata** (title, genre, tone, etc.)
2. **Human Model style** (if configured)
3. **Current chapter context** (title, summary)
4. **Project characters** (basic list)
5. **Dead characters warning** (from project)
6. **Project locations** (basic list)
7. **Project plot events** (basic list)
8. **Project sources** (if any)
9. **📖 Cumulative Saga Synopsis** (from continuity)
10. **🟢🔴🟡⚪ Character States** (from continuity, with visual status indicators)
11. **📜 Past Events** (from continuity, across all episodes)
12. **📍 Locations Visited** (from continuity, across all episodes)
13. **⏰ Timeline** (from continuity)
14. **📋 Saga Continuity Instructions** (explicit requirements)
15. **User prompt** (specific generation instructions)

## Benefits

1. **Prevents Character Resurrection:** Dead characters are explicitly marked and the AI is instructed not to use them
2. **Maintains Event Coherence:** All past events are available for reference
3. **Location Consistency:** The AI knows which locations have been visited and their significance
4. **Narrative Continuity:** The cumulative synopsis helps the AI understand the full story arc
5. **Timeline Accuracy:** The AI can maintain proper temporal relationships
6. **Character Arc Continuity:** Status notes (injured, missing, etc.) inform character development

## Testing Notes

To test this feature:

1. Create a saga with at least 2 projects (episodes)
2. Finalize the first project to create continuity data
3. Create a sequel project (either via "Crea Seguito" or via `/api/sagas/:id/create-sequel`)
4. Generate chapters for the sequel
5. Verify that:
   - Dead characters from previous episodes do not appear
   - References to past events are accurate
   - Locations are consistent with previous episodes
   - The AI has context from the entire saga

## Logging

The implementation includes comprehensive logging:

```
[Projects-Stream] Including continuity context for chapter generation: {
  episodeCount: 3,
  hasSynopsis: true,
  hasCharacterStates: true,
  hasEvents: true,
  hasLocations: true,
  hasTimeline: true
}

[Generate Stream] Including continuity context for chapter generation: {
  projectId: 'xxx',
  episodeCount: 2,
  hasSynopsis: true,
  hasCharacterStates: true,
  hasEvents: true
}

[Regenerate Stream] Including continuity context for chapter regeneration: {
  projectId: 'xxx',
  episodeCount: 2,
  hasSynopsis: true,
  hasCharacterStates: true,
  hasEvents: true
}
```

## Feature Status

**Implementation:** ✅ Complete
**Files Modified:**
- `server/src/routes/projects.ts` (helper function + sequel-stream updates)
- `server/src/routes/chapters.ts` (generate-stream + regenerate-stream updates)

**Test Steps Verification:**
1. ✅ "Modificare generateChapterContent per includere continuity" - Implemented in all generation endpoints
2. ✅ "Costruire contesto AI con: personaggi vivi/morti, relazioni, eventi passati, sinossi episodi precedenti" - All fields included
3. ✅ "Aggiungere prompt instructions per rispettare continuity" - Explicit instructions added
4. ⏸️ "Testare che AI non resusciti personaggi morti" - Requires manual testing with AI provider
5. ⏸️ "Verificare coerenza luoghi ed eventi" - Requires manual testing with AI provider

**Note:** Due to sandbox restrictions preventing server restart, manual browser testing cannot be performed in this session. The code changes are complete and ready for testing once the server is restarted.

## Related Features

- Feature #299: Saga continuity endpoints
- Feature #300: Create sequel with continuity
- Feature #275: Include character status (alive/dead) in generation

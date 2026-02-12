# Feature #139: Readability Score for Redattore

## Status: IMPLEMENTED ✅

## Implementation Summary

### Frontend Changes (`client/src/pages/ChapterEditor.tsx`)

Added comprehensive readability analysis for Redattore articles.

#### New State Variables:
```typescript
const [readabilityScore, setReadabilityScore] = useState<{
  score: number;        // Flesch Reading Ease (0-100)
  grade: string;        // Grade level description
  notes: string[];     // Observations about the text
  suggestions: string[]; // Improvement suggestions
} | null>(null);

const [showReadabilityPanel, setShowReadabilityPanel] = useState(false);
```

#### Readability Calculation Function

`calculateReadability(text, wordCount)` - Calculates Flesch Reading Ease Score adapted for Italian

**Metrics Calculated:**
1. **Sentence Count** - Number of sentences (split by . ! ?)
2. **Word Count** - Total words
3. **Syllable Count** - Total syllables (Italian counting)
4. **Avg Words/Sentence** - Average sentence length
5. **Avg Syllables/Word** - Word complexity

**Formula (Flesch Reading Ease):**
```
Score = 206.835 - (1.015 × avgWordsPerSentence) - (84.6 × avgSyllablesPerWord)
```

**Score Interpretation:**
- **90-100**: Elementare (5° elementare) - Very easy to read
- **80-89**: Media (6°-8°) - Easy to read
- **70-79**: Superiori (9°-10°) - Fairly easy to read
- **60-69**: Biennio (11°-12°) - Plain English/Italian
- **0-59**: Università o superiore - Difficult to read

**Syllable Counting for Italian:**
- Counts vowels (à, è, é, ì, ò, ù)
- Considers consonant clusters
- Minimum 1 syllable per word

#### Analysis Notes & Suggestions

The system generates contextual notes and suggestions:

**Checks Performed:**
1. **Sentence Length**
   - Too long (>25 words): Suggest splitting
   - Too short (<10 words): Suggest combining
   - Optimal: 10-25 words per sentence

2. **Word Complexity**
   - Too many syllables (>2.5 per word): Suggest simpler words

3. **Content Length**
   - Too short (<100 words): Suggest expanding
   - Long & complex (>2000 words, >20 w/s): Suggest subheadings

4. **Sentence Count**
   - Too few (<5): Suggest adding more for natural flow

### UI Components

#### 1. Quick Score Badge (Toolbar)

Location: In the editor toolbar next to word count

```tsx
{readabilityScore && project?.area === 'redattore' && (
  <div className="flex items-center gap-1 ml-2">
    <span className="text-xs font-medium px-2 py-1 rounded-full"
          style={{
            backgroundColor: score >= 80 ? 'green' :
                           score >= 60 ? 'yellow' : 'red'
          }}>
      {score}/100
    </span>
    <span className="text-xs text-gray-500">
      {grade}
    </span>
  </div>
)}
```

**Visual Indicators:**
- 🟢 **Green** (80-100): Easy to read
- 🟡 **Yellow** (60-79): Moderate difficulty
- 🔴 **Red** (0-59): Difficult to read

#### 2. Toggle Button (Toolbar)

Sparkles icon button to show/hide the detailed readability panel:
- Only visible for Redattore projects
- Highlighted when panel is open
- Positioned next to Version History button

#### 3. Detailed Analysis Panel

Collapsible panel with comprehensive analysis:

**Header Section:**
- Title: "Analisi Leggibilità" with Sparkles icon
- Close button to dismiss panel

**Score Display:**
- Large score number (color-coded)
- Grade level badge
- Visual gradient from green to red

**Notes Section:**
- Bullet points of observations
- Gray color for neutral presentation
- Only shows if there are notes

**Suggestions Section:**
- Lightbulb icon for emphasis
- Green checkmark icons for each suggestion
- Numbered list for easy scanning
- White/dark mode compatible cards

**Empty State:**
When panel is open but no content yet:
```
"Scrivi qualcosa nell'editor per vedere l'analisi
di leggibilità in tempo reale."
```

### Real-Time Updates

Readability recalculates automatically when:
1. Content changes
2. Project area changes
3. Editor is NOT in preview mode

**Recalculation Trigger:**
```typescript
useEffect(() => {
  const words = content.trim().split(/\s+/).filter(w => w.length > 0);
  setWordCount(words.length);

  const readingMinutes = Math.ceil(words.length / 200);
  setReadingTime(readingMinutes);

  if (project?.area === 'redattore' && content.trim().length > 0) {
    const readability = calculateReadability(content, words.length);
    setReadabilityScore(readability);
  } else {
    setReadabilityScore(null);
  }
}, [content, project?.area]);
```

## User Flow

1. **Open Redattore Article**
   - Navigate to project in Redattore area
   - Open a chapter for editing

2. **View Quick Score**
   - Look at toolbar for score badge
   - See color indicator (green/yellow/red)
   - Read grade level (e.g., "Media (6°-8°)")

3. **Open Detailed Panel**
   - Click Sparkles icon in toolbar
   - Panel slides open below toolbar
   - See full analysis

4. **Edit Content**
   - Make changes to article text
   - Score updates in real-time
   - Notes and suggestions adjust dynamically

5. **Review Suggestions**
   - Read improvement suggestions
   - Apply changes based on recommendations
   - Watch score improve

6. **Close Panel**
   - Click X button or Sparkles icon
   - Panel collapses
   - Quick score badge remains visible

## Verification Steps

### Manual Testing Required:

1. **Create Redattore Project:**
   - New project → Area: Redattore
   - Create a chapter

2. **Test Simple Text:**
   - Type: "Questo è un articolo semplice."
   - Expected: High score (80-100)
   - Check: Grade shows "Elementare" or "Media"

3. **Test Complex Text:**
   - Paste complex academic text with long sentences
   - Expected: Lower score (0-59)
   - Check: Notes mention "Frasi molto lunghe"
   - Check: Suggestion to split sentences

4. **Test Empty State:**
   - Clear editor
   - Expected: No score badge
   - Open panel: See "write something" message

5. **Test Real-Time Updates:**
   - Type character by character
   - Verify: Score updates after each sentence
   - Verify: Panel content changes live

6. **Test Area Switching:**
   - Create Romanziere project
   - Verify: No readability features appear
   - Switch to Redattore
   - Verify: Features appear

### Sample Test Cases:

**Test 1: Simple Article**
```
Text: "Il sole splende. Il cielo è blu. Gli uccellini cantano."
Expected Score: 90-100 (very easy)
Expected Grade: Elementare
Notes: None or positive
```

**Test 2: Complex Academic Text**
```
Text: Long academic sentence with multiple subordinate clauses and complex vocabulary.
Expected Score: 30-50 (difficult)
Expected Grade: Università
Notes: "Frasi molto lunghe", "Parole complesse"
Suggestions: Split sentences, use simpler words
```

**Test 3: Balanced Text**
```
Text: Well-structured article with 15-20 words per sentence, moderate vocabulary.
Expected Score: 60-79 (fairly easy)
Expected Grade: Superiori or Biennio
Notes: Minimal or none
```

## Design Features

### Accessibility
- ✅ High contrast colors for score badges
- ✅ Large, readable score number
- ✅ Clear iconography (Sparkles, Lightbulb, X)
- ✅ ARIA labels on all buttons
- ✅ Keyboard accessible toggle

### Dark Mode
- ✅ All backgrounds have dark variants
- ✅ Text colors invert properly
- ✅ Borders adapt to dark mode
- ✅ Readable in both modes

### Responsive
- ✅ Panel adapts to available width
- ✅ Toolbar buttons wrap on mobile
- ✅ Suggestions scroll if many

## Italian Language Support

All text is in Italian:
- "Analisi Leggibilità"
- "Elementare", "Media", "Superiori", etc.
- "Frasi molto lunghe/brevi"
- "Suggerimenti per migliorare"

## Integration Points

This feature integrates with:
- **Redattore area** - Only active for redattore projects
- **Chapter Editor** - Reads content in real-time
- **Word count** - Uses same word counting
- **Project settings** - Checks project.area

## Files Modified

1. `client/src/pages/ChapterEditor.tsx` - Added readability calculation, UI, and state

## Future Enhancements (Optional)

- Export readability report
- Historical readability tracking
- Competitor comparison
- SEO keyword density analysis
- Reading time by audience segment
- Industry benchmarking

## Notes

- **Algorithm**: Flesch Reading Ease adapted for Italian
- **Real-time**: Score updates on every keystroke
- **Non-intrusive**: Panel can be dismissed
- **Context-aware**: Suggestions adapt to specific issues found
- **Performance**: Calculation is O(n) where n = word count

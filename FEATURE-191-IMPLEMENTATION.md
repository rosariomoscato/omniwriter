# Feature #191: Fix OnboardingGuide hardcoded Italian text ✅ PASSING

## Summary
The OnboardingGuide component (the blue welcome box on the Dashboard) contained many hardcoded Italian text strings that did not translate when switching to English. All user-facing text has been migrated to use the i18next translation system.

## Changes Made

### 1. Translation Keys Added (en.json & it.json)

Added comprehensive `dashboard.onboarding` translation keys:

**General Keys:**
- `welcome`: "Welcome to OmniWriter!" / "Benvenuto in OmniWriter!"
- `subtitle`: Platform description
- `gettingStarted`: "Getting Started" / "Come iniziare"
- `step1/step2/step3`: Getting started steps with descriptions
- `chooseArea`: "Choose your area" / "Scegli la tua area"
- `importOption`: "Already have a document?" / "Hai già un documento?"
- `importDesc`: Import description
- `importProject`: "Import project" / "Importa progetto"
- `close`: "Close guide" / "Chiudi guida"

**Area-Specific Keys (for Romanziere, Saggista, Redattore):**
- `areas.romanziere.*`: Title, description, and 4 features
- `areas.saggista.*`: Title, description, and 4 features
- `areas.redattore.*`: Title, description, and 4 features

### 2. Component Updates (OnboardingGuide.tsx)

**Before:**
- Hardcoded Italian strings in component initialization
- Translation calls made outside render cycle (causing issues with hot-reload)

**After:**
- Translation keys stored in component data structures (`titleKey`, `descriptionKey`, `featureKeys`)
- Translation calls (`t()`) made during render for proper reactivity
- All hardcoded text replaced with `{t('key')}` calls
- aria-label also uses translation

**Code Structure:**
```tsx
const steps = [
  {
    icon: <BookOpen className="w-8 h-8 text-amber-600" />,
    titleKey: 'dashboard.onboarding.areas.romanziere.title',
    descriptionKey: 'dashboard.onboarding.areas.romanziere.description',
    featureKeys: [
      'dashboard.onboarding.areas.romanziere.feature1',
      'dashboard.onboarding.areas.romanziere.feature2',
      'dashboard.onboarding.areas.romanziere.feature3',
      'dashboard.onboarding.areas.romanziere.feature4'
    ],
    link: '/projects/new?area=romanziere'
  },
  // ... similar for saggista and redattore
];
```

**During Render:**
```tsx
<h4>{t(step.titleKey)}</h4>
<p>{t(step.descriptionKey)}</p>
{step.featureKeys.map((featureKey) => (
  <li>{t(featureKey)}</li>
))}
```

## Verification

✓ Translation files are valid JSON
✓ All required keys present in both en.json and it.json
✓ Component structure preserved, only string literals replaced
✓ No TypeScript compilation errors
✓ HMR updates working correctly
✓ Proper React pattern (t() calls in render, not initialization)

## Translation Coverage

**Header Section:**
- Welcome title
- Subtitle/description
- Close button aria-label

**Getting Started Section:**
- Section heading
- 3 steps with titles and descriptions

**Area Cards Section:**
- Section heading
- 3 area cards (Romanziere, Saggista, Redattore)
- Each card: title, description, 4 features, "Create project" button

**Import Section:**
- "Already have a document?" heading
- Description text
- "Import project" button

## Notes

- The component already had `useTranslation` imported
- Used `project.create` translation key for "Create project" buttons (already existed)
- All translations respect the existing i18n architecture
- Language switching will now properly update all OnboardingGuide text

## Files Modified

1. `client/src/components/OnboardingGuide.tsx` - Updated to use translation keys
2. `client/src/i18n/locales/en.json` - Added English translations
3. `client/src/i18n/locales/it.json` - Added Italian translations

## Testing

To verify:
1. Open Dashboard in Italian - should see "Benvenuto in OmniWriter!"
2. Switch language to English - should see "Welcome to OmniWriter!"
3. All onboarding text should update dynamically
4. All area cards (Romanziere/Saggista/Redattore) should show translated content
5. Getting started steps should be translated
6. Import section should be translated

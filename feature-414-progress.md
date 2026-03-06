# Feature #414: Remove Payment/Subscription System

## Status: IN PROGRESS (Part 2 Complete)

## Completed Work

### 1. Database Schema Changes
- ✅ Removed `subscription_status` column from users table
- ✅ Removed `subscription_expires_at` column from users table
- ✅ Added migration to rebuild users table without subscription columns
- ✅ Migration handles existing databases by preserving data while dropping columns

**Files Modified:**
- `server/src/db/database.ts`

### 2. Server-Side Changes

#### Model Updates
- ✅ Removed `subscription_status` and `subscription_expires_at` from User interface
- ✅ Added `storage_used_bytes` and `storage_limit_bytes` to User interface

**Files Modified:**
- `server/src/models/User.ts`

#### Route Updates
- ✅ Removed subscription columns from SELECT queries in users.ts
- ✅ Removed subscription columns from SELECT queries in auth.ts
- ✅ Removed subscription check in login flow (suspended user check)
- ✅ Removed user suspension feature from admin.ts (tied to subscription_status)
- ✅ Removed status filter from admin user list (was filtering by subscription_status)

**Files Modified:**
- `server/src/routes/users.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/admin.ts`

### 3. Client-Side Changes

#### Component Removal
- ✅ Deleted `UpgradeModal.tsx` component
- ✅ Deleted `PremiumBadge.tsx` component

#### Component Updates
- ✅ Simplified `FeatureGate.tsx` to always show children
  - Removed tier permission checks
  - Removed PremiumBadge usage
  - All features now accessible to all users (Feature #401)

**Files Modified:**
- `client/src/components/FeatureGate.tsx`
- `client/src/components/UpgradeModal.tsx` (deleted)
- `client/src/components/PremiumBadge.tsx` (deleted)

#### Page Updates
- ✅ **SagasPage.tsx** (Part 1)
  - Removed UpgradeModal import
  - Removed showUpgradeModal state
  - Removed onUpgradeClick props from FeatureGate components
  - Removed UpgradeModal component from render

- ✅ **HumanModelPage.tsx** (Part 1)
  - Removed UpgradeModal and PremiumBadge imports
  - Removed useTierPermissions hook
  - Removed tier permission logic (isPremium, getLimit, canAccess)
  - Set canCreateProfile = true (unlimited)
  - Set hasFullAnalysis = true
  - Removed PremiumBadge usages throughout
  - Removed upgrade modal state and component
  - Simplified profile counter (removed limit display)

- ✅ **SourcesPage.tsx** (Part 2 - NEW)
  - Removed UpgradeModal import
  - Removed useTierPermissions import
  - Removed Lock and AlertTriangle icons (no longer needed)
  - Removed showUpgradeModal state
  - Removed tier permission variables (maxSources, hasUnlimitedSources, isAtLimit, isNearLimit)
  - Removed source limit check in handleFileUpload
  - Removed source counter display (tier-limited user info)
  - Removed locked upload button (isAtLimit case)
  - Removed UpgradeModal component from render
  - All users now have unlimited source uploads

- ✅ **ProjectDetail.tsx** (Part 2 - NEW)
  - Removed UpgradeModal import
  - Removed useTierPermissions import
  - Removed canExportFormat hook usage
  - Removed showUpgradeModal state
  - Removed conditional EPUB export (was: canExportFormat('epub') ? premium : upgrade modal)
  - EPUB export now available for all users (no Crown icon, no premium badge)
  - Removed UpgradeModal component from render

- ✅ **SettingsPage.tsx** (Part 2 - NEW)
  - Removed UpgradeModal import
  - Removed PremiumBadge import
  - Removed TIER_LIMITS, PREMIUM_TIERS, UserRole imports from tier-config
  - Removed ArrowUpCircle icon (no longer needed for upgrade button)
  - Removed showUpgradeModal state
  - Removed userRole, tierLimits, isPremium useMemo hooks
  - Removed entire Tier Status Card section (160+ lines)
  - Removed UpgradeModal component from render
  - Settings page now focuses only on account settings and password

- ✅ **ChapterEditor.tsx** (Part 2 - NEW)
  - Removed useTierPermissions import
  - Removed getLimit hook usage
  - Removed tier limit check in chapter length dropdown
  - Removed isOverTierLimit variable
  - Removed chapter length tier warning message
  - All chapter length options now available to all users

**Files Modified:**
- `client/src/pages/SagasPage.tsx`
- `client/src/pages/HumanModelPage.tsx`
- `client/src/pages/SourcesPage.tsx` (Part 2 - Complete)
- `client/src/pages/ProjectDetail.tsx` (Part 2 - Complete)
- `client/src/pages/SettingsPage.tsx` (Part 2 - Complete)
- `client/src/pages/ChapterEditor.tsx` (Part 2 - Complete)

## Remaining Work

### Medium Priority
1. **Update useTierPermissions hook**
   - `client/src/hooks/useTierPermissions.ts`
   - Simplify to return fixed values (all features accessible)
   - Or remove entirely if no longer used after Part 2

2. **Update translation files**
   - `client/src/i18n/locales/it.json`
   - `client/src/i18n/locales/en.json`
   - Remove subscription, payment, premium, upgrade strings

3. **Remove or simplify tier config files**
   - `client/src/config/tier-config.ts`
   - Simplify to return unlimited values for all features
   - Or remove if no longer needed

### Testing
4. **Verify compilation**
   - ✅ Test server compiles without errors
   - ✅ Test client compiles without errors (Part 2 verified)

5. **Test functionality**
   - Verify app loads in browser
   - Verify no console errors
   - Verify all features accessible
   - Verify no broken UI/links

## Commit History
- **1d5568c** - feat(#414): Remove payment/subscription system (Part 1)
- **TBD** - feat(#414): Remove payment/subscription system (Part 2 - Page Updates)

## Next Steps
1. Update useTierPermissions hook to return fixed "unlimited" values
2. Clean up translation files
3. Simplify or remove tier-config.ts
4. Test functionality with browser automation
5. Mark feature as passing

# Feature #414: Remove Payment/Subscription System

## Status: IN PROGRESS (Part 1 Complete)

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
- ✅ **SagasPage.tsx**
  - Removed UpgradeModal import
  - Removed showUpgradeModal state
  - Removed onUpgradeClick props from FeatureGate components
  - Removed UpgradeModal component from render

- ✅ **HumanModelPage.tsx**
  - Removed UpgradeModal and PremiumBadge imports
  - Removed useTierPermissions hook
  - Removed tier permission logic (isPremium, getLimit, canAccess)
  - Set canCreateProfile = true (unlimited)
  - Set hasFullAnalysis = true
  - Removed PremiumBadge usages throughout
  - Removed upgrade modal state and component
  - Simplified profile counter (removed limit display)

- ⚠️ **SourcesPage.tsx** (partially done)
  - Commented out UpgradeModal and useTierPermissions imports
  - Needs: full update to remove upgrade modal usage

**Files Modified:**
- `client/src/pages/SagasPage.tsx`
- `client/src/pages/HumanModelPage.tsx`
- `client/src/pages/SourcesPage.tsx` (partial)

## Remaining Work

### High Priority
1. ⚠️ **Update SourcesPage.tsx**
   - Remove commented imports
   - Remove showUpgradeModal state
   - Remove onUpgradeClick handlers
   - Remove UpgradeModal component

2. ⚠️ **Update ProjectDetail.tsx**
   - Remove PremiumBadge and UpgradeModal imports
   - Remove upgrade modal state and usage
   - Simplify any tier-gated features

3. ⚠️ **Update SettingsPage.tsx**
   - Remove UpgradeModal import and usage
   - Remove any subscription/premium UI elements

### Medium Priority
4. **Update useTierPermissions hook**
   - `client/src/hooks/useTierPermissions.ts`
   - Simplify to return fixed values (all features accessible)
   - Or remove entirely if not used elsewhere

5. **Update translation files**
   - `client/src/i18n/locales/it.json`
   - `client/src/i18n/locales/en.json`
   - Remove subscription, payment, premium, upgrade strings

6. **Remove tier config files**
   - Check if `client/src/config/tier-config.ts` exists
   - Remove if exists and no longer needed

### Testing
7. **Verify compilation**
   - Test server compiles without errors
   - Test client compiles without errors

8. **Test functionality**
   - Verify app loads in browser
   - Verify no console errors
   - Verify all features accessible
   - Verify no broken UI/links

## Commit History
- **1d5568c** - feat(#414): Remove payment/subscription system (Part 1)

## Next Steps
1. Complete remaining page updates (SourcesPage, ProjectDetail, SettingsPage)
2. Update useTierPermissions hook
3. Clean up translation files
4. Test compilation and functionality
5. Mark feature as passing

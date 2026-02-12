# Feature #196 - Fix duplicate Dashboard files causing wrong page display

## Problem Description
There were two different Dashboard files in the codebase:
1. `/pages/Dashboard.tsx` - Complete and working Dashboard with area/status/search filters
2. `/pages/DashboardPage.tsx` - Old static Dashboard that always showed "Nessun progetto trovato"

Additionally, there were backup files:
- `Dashboard.tsx.broken`
- `Dashboard.tsx.fixed`

## Root Cause Analysis
The feature description suggested that clicking area buttons (Romanziere, Saggista, Redattore) in the sidebar might show the wrong Dashboard page. However, upon investigation:

1. **App.tsx was already correct** - Line 14 shows `import Dashboard from './pages/Dashboard';`
2. **Dashboard.tsx was already correct** - It properly handles `area` URL parameter via `useSearchParams()`
3. **DashboardPage.tsx was obsolete** - Not imported anywhere, contained old static code

The duplicate files were causing confusion and could potentially lead to import errors if someone accidentally imported the wrong file.

## Solution
Deleted the obsolete files:
1. `client/src/pages/DashboardPage.tsx` - Old static dashboard
2. `client/src/pages/Dashboard.tsx.broken` - Backup file
3. `client/src/pages/Dashboard.tsx.fixed` - Backup file

Kept:
- `client/src/pages/Dashboard.tsx` - The correct, working Dashboard

## Verification
After the fix:
- ✅ Only `Dashboard.tsx` exists in `/pages/` directory
- ✅ `App.tsx` correctly imports `Dashboard` from `./pages/Dashboard`
- ✅ Dashboard properly handles area filters via URL parameter (`?area=romanziere`, etc.)
- ✅ No risk of accidentally importing the wrong file

## Dashboard.tsx Functionality
The remaining Dashboard.tsx correctly:
- Reads `area` parameter from URL: `searchParams.get('area')`
- Filters projects by area when area parameter is present
- Passes `area` to API call: `apiService.getProjects({ area, status, search, sort, tag })`
- Shows all projects when area is 'all' or not specified
- Displays "0 progetti" when no projects match the filter (expected behavior)

## Files Modified
- Deleted: `client/src/pages/DashboardPage.tsx`
- Deleted: `client/src/pages/Dashboard.tsx.broken`
- Deleted: `client/src/pages/Dashboard.tsx.fixed`

## Note
The Dashboard.tsx was already working correctly. The issue was simply the presence of obsolete duplicate files that could cause confusion.

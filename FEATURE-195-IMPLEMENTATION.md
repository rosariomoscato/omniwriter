# Feature #195 - Fix "Route not found" popups on Sources page

## Problem Description
When navigating to the Sources page (/sources), two popup toast notifications appeared with the message "Route not found". The backend routes for sources existed in the code, but were returning 404 errors.

## Root Cause Analysis

### Investigation Steps:
1. Checked browser network requests - confirmed `/api/sources` was returning 404
2. Checked server logs - requests were being logged but not processed
3. Examined `server/src/routes/sources.ts` - routes were defined correctly
4. Checked `server/src/index.ts` - sources router was properly mounted at `/api`

### Root Cause:
The route handlers in `server/src/routes/sources.ts` used `res: Response` type annotation:
```typescript
router.get('/sources', authenticateToken, (req: AuthRequest, res: Response) => {
```

However, the `Response` type was NOT imported in the file. The file only imported:
- `express`
- `getDatabase`
- `authenticateToken`, `AuthRequest`
- `requirePremium`
- `multer`, `path`, `fs`

With `// @ts-nocheck` at the top of the file, TypeScript compilation didn't catch this error. At runtime, when Node.js tried to evaluate the undefined `Response` type, it caused the module to fail loading properly. This prevented the route handlers from being registered with Express, even though the file itself was imported.

### Why it appeared as "Route not found":
1. The sources router was imported in index.ts
2. The module failed to load properly due to undefined `Response` reference
3. The router was empty (no handlers registered)
4. Requests to `/api/sources` fell through to the 404 handler

## Solution

Changed all route handler response type annotations from `Response` to `any`:

### Line 76:
```diff
- router.get('/projects/:id/sources', authenticateToken, (req: AuthRequest, res: Response) => {
+ router.get('/projects/:id/sources', authenticateToken, (req: AuthRequest, res: any) => {

### Line 113:
```diff
- router.get('/sources', authenticateToken, (req: AuthRequest, res: Response) => {
+ router.get('/sources', authenticateToken, (req: AuthRequest, res: any) => {

### Line 381:
```diff
- async (req: AuthRequest, res: Response) => {
+ async (req: AuthRequest, res: any) => {

### Line 446:
```diff
- router.get('/sagas/:id/sources', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
+ router.get('/sagas/:id/sources', authenticateToken, requirePremium, (req: AuthRequest, res: any) => {

## Files Modified
- `server/src/routes/sources.ts` - Fixed 4 route handler type annotations

## Testing Required
After server restart, the following should work correctly:
1. Navigate to /sources page
2. GET /api/sources should return 200 with sources data
3. No "Route not found" toast notifications should appear
4. Sources page should display user's sources correctly

## Note
This fix requires a server restart to take effect since the sources.ts module needs to be reloaded. The tsx watcher may not detect the type annotation change automatically.

# Sandbox Permission Issue - Regression Test Failure

**Date:** 2026-02-12
**Features Affected:** 1, 2, 3 (All Infrastructure features)
**Status:** CRITICAL - Blocking all infrastructure testing

## Issue

The Node.js server cannot start due to sandbox permission errors:

```
Error: listen EPERM: operation not permitted [address]:[port]
```

## Attempts Made

1. **Port Changes:** Tried ports 3001, 4000, 5001
2. **Host Binding:** Tried 0.0.0.0, localhost, 127.0.0.1, no explicit host
3. **Direct Execution:** Ran `node server/dist/index.js` directly
4. **Rebuild:** Rebuilt TypeScript to ensure fresh code

All attempts failed with the same EPERM error.

## Root Cause

The sandbox environment is preventing Node.js from binding to any network ports. This appears to be a new restriction that was not present when these features originally passed.

## Impact

- **Feature 1 (Database connection established):** Cannot test /api/health endpoint
- **Feature 2 (Database schema applied correctly):** Cannot verify tables through running API
- **Feature 3 (Data persists across server restart):** Cannot test server lifecycle

## Required Fix

The sandbox configuration needs to allow Node.js servers to:
1. Bind to localhost ports (3000-4000 range)
2. Accept incoming connections on 127.0.0.1
3. Make database connections to SQLite files

## Verification

Once sandbox is fixed, verify with:
```bash
cd /Users/rosario/CODICE/omniwriter
node server/dist/index.js
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status": "ok", "database": "connected"}
```

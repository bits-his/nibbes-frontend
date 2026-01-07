# Chart Error Fix - Deployment Instructions

## Problem
Users are experiencing: `Uncaught ReferenceError: Cannot access 'r' before initialization` in `charts-vendor-*.js`

## Root Cause
Recharts library has internal circular dependencies that break when code-split into separate chunks. This is a known issue with recharts bundling.

## Solution Applied
1. **Changed Vite config** to keep recharts in the main bundle (not split into separate chunk)
2. **Added error handling** to gracefully catch and handle the error
3. **Recharts is now bundled with main app code** to avoid circular dependency issues

## Deployment Steps

### 1. Build the new version
```bash
cd nibbes-frontend
npm run build
```

### 2. Deploy the new build
- The new build will have recharts in the main bundle (no separate charts-vendor chunk)
- File size will be larger (~933KB main bundle) but it will work correctly

### 3. Clear CDN/Cache (IMPORTANT!)
After deployment, you MUST:
- Clear your CDN cache (if using Cloudflare, Netlify, etc.)
- Clear browser cache for users (or wait for cache expiration)
- The old `charts-vendor-*.js` file will still be cached and cause errors

### 4. For Users Experiencing the Error
Users should:
1. **Hard refresh** the page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache** if hard refresh doesn't work
3. **Try incognito/private mode** to test without cache

## Verification
After deployment, check:
- No `charts-vendor-*.js` file in the build output
- Main bundle (`index-*.js`) is larger (~933KB)
- Charts load without errors in browser console

## If Error Persists
1. Check that the new build is actually deployed (check file timestamps)
2. Verify CDN cache is cleared
3. Check browser console for the exact error message
4. Ensure users are loading the new version (check network tab for file names)

## Technical Details
- **Old build**: Recharts split into `charts-vendor-*.js` → circular dependency error
- **New build**: Recharts in main bundle → no circular dependency, works correctly
- **Trade-off**: Larger main bundle, but guaranteed to work


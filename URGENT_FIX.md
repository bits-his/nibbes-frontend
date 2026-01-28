# 🚨 URGENT FIX - Site Down

## IMMEDIATE STEPS (Do This Now!)

### Step 1: Verify File Structure in public_html
You should see these files **DIRECTLY** in public_html (NOT in a subfolder):

```
public_html/
├── .htaccess          ← MUST be here
├── index.html         ← MUST be here  
├── assets/            ← MUST be here (folder)
│   ├── js/
│   └── css/
├── manifest.json
├── service-worker.js
└── pwa-icons/
```

**CRITICAL:** If you see a `dist` folder, the files are in the WRONG place!

### Step 2: If Files Are in `dist` Folder
1. Open the `dist` folder
2. Select ALL files (Ctrl+A or Cmd+A)
3. **Cut** them (Ctrl+X)
4. Go back to `public_html` (parent folder)
5. **Paste** them (Ctrl+V)
6. Delete the empty `dist` folder

### Step 3: Replace .htaccess Content
Copy this EXACT content into your `.htaccess` file:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
```

### Step 4: Check File Permissions
- `.htaccess` → `644`
- `index.html` → `644`
- `assets/` folder → `755`

### Step 5: Test Immediately
Visit: `https://nibblesfastfood.com`

## If Still Not Working

### Check Apache Error Log
1. cPanel → **Error Log** (in sidebar)
2. Look for errors mentioning:
   - `.htaccess`
   - `mod_rewrite`
   - `syntax error`

### Quick Test
Try accessing directly:
- `https://nibblesfastfood.com/index.html` (should work)
- `https://nibblesfastfood.com/` (might fail if .htaccess broken)

If `index.html` works but root doesn't → `.htaccess` issue

### Contact Hosting Support
Tell them:
- "My site shows ERR_CONNECTION_REFUSED"
- "Please enable mod_rewrite module"
- "Please check Apache error logs for .htaccess errors"

## Most Common Issue
**Files are in `dist` subfolder instead of `public_html` root!**

Move all files from `dist/` to `public_html/` directly.

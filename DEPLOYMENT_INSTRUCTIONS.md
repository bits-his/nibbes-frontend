# 🚀 DEPLOYMENT INSTRUCTIONS - Fix Connection Refused Error

## Problem
After uploading build, site shows "ERR_CONNECTION_REFUSED"

## ✅ Solution Steps

### Step 1: Extract dist.zip
1. In cPanel File Manager, go to your domain root (`public_html` or domain folder)
2. Find `dist.zip` file
3. Right-click → **Extract**
4. This creates a `dist` folder

### Step 2: Move Files to Root (CRITICAL!)
1. Open the extracted `dist` folder
2. **Select ALL files** (including hidden `.htaccess`)
   - In cPanel, enable "Show Hidden Files" to see `.htaccess`
3. **Move** all files to the root (`public_html`)
4. **Delete** the empty `dist` folder

### Step 3: Verify File Structure
Your root should look like this:
```
public_html/
├── .htaccess          ← MUST BE HERE (hidden file)
├── index.html         ← MUST BE HERE
├── assets/
│   ├── js/
│   └── css/
├── manifest.json
├── service-worker.js
├── pwa-icons/
└── ... (other files)
```

### Step 4: Check File Permissions
- Files: `644` (read/write for owner, read for others)
- Folders: `755` (read/write/execute for owner, read/execute for others)

### Step 5: Test
Visit: `https://nibblesfastfood.com`

## 🔧 If Still Not Working

### Option A: Check Apache Error Log
1. cPanel → **Error Log**
2. Look for `.htaccess` errors
3. Common issues:
   - `mod_rewrite` not enabled
   - Syntax error in `.htaccess`

### Option B: Try Simpler .htaccess
If proxy rule is causing issues, replace `.htaccess` with:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
```

### Option C: Contact Hosting Support
Ask them to:
1. Enable `mod_rewrite`
2. Enable `mod_headers`
3. Check if there are any server restrictions

## 📋 Quick Checklist
- [ ] dist.zip extracted
- [ ] All files moved to root (not in dist subfolder)
- [ ] .htaccess is in root (enable "Show Hidden Files" to see it)
- [ ] index.html is in root
- [ ] assets folder is in root
- [ ] File permissions: 644 for files, 755 for folders
- [ ] No syntax errors in .htaccess
- [ ] mod_rewrite enabled on server

## ⚠️ Common Mistakes
1. ❌ Files still in `dist` folder → Move to root
2. ❌ .htaccess not uploaded → Enable "Show Hidden Files"
3. ❌ Wrong file permissions → Set to 644/755
4. ❌ mod_rewrite disabled → Contact hosting support

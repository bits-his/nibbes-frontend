# 🚀 DEPLOYMENT FIX - Connection Refused Error

## Problem
After uploading the build, the site shows "ERR_CONNECTION_REFUSED". This is likely because:
1. The `dist.zip` file needs to be extracted
2. Files need to be in the correct location
3. The `.htaccess` proxy rule might require mod_proxy (which may not be enabled)

## ✅ Solution

### Step 1: Extract dist.zip
1. In cPanel File Manager, navigate to your domain root (`public_html` or your domain folder)
2. Find `dist.zip` file
3. Right-click → Extract
4. This will create a `dist` folder with all files

### Step 2: Move Files to Root
1. Open the extracted `dist` folder
2. Select ALL files inside (including hidden files like `.htaccess`)
3. Move them to the root of your domain folder (`public_html`)
4. Delete the empty `dist` folder

### Step 3: Update .htaccess (if proxy doesn't work)
If the site still doesn't work, the proxy rule might be causing issues. Use this simpler `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html for SPA routing
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  # Cache headers
  <FilesMatch "^(index\.html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  
  <FilesMatch "^(service-worker\.js)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
```

### Step 4: Verify File Structure
Your domain root should have:
```
public_html/
├── .htaccess          (IMPORTANT: Hidden file!)
├── index.html
├── assets/
│   ├── js/
│   └── css/
├── manifest.json
├── service-worker.js
├── pwa-icons/
└── ... (other files)
```

### Step 5: Check File Permissions
- `.htaccess` should be `644`
- `index.html` should be `644`
- Folders should be `755`

### Step 6: Test
1. Visit your domain: `https://nibblesfastfood.com`
2. Should load the React app
3. Check browser console for errors

## 🔧 If Still Not Working

1. **Check Apache Error Log**: Look in cPanel → Error Log
2. **Verify mod_rewrite is enabled**: Contact hosting support
3. **Try accessing directly**: `https://nibblesfastfood.com/index.html`
4. **Check DNS**: Make sure domain points to correct server

## 📝 Quick Checklist
- [ ] dist.zip extracted
- [ ] All files moved to root (not in dist folder)
- [ ] .htaccess file is in root
- [ ] File permissions are correct (644 for files, 755 for folders)
- [ ] No syntax errors in .htaccess
- [ ] mod_rewrite is enabled on server

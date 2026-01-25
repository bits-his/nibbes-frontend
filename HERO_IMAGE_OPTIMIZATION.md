# 🖼️ Hero Image Optimization - CRITICAL

## Problem
The hero image (`Nigerian_cuisine_hero_image_337661c0.png`) is **8.2MB**, which is causing:
- Slow FCP (13.0s)
- Slow LCP (25.4s)
- Large network payload (12.4MB total)

## Solution

### Option 1: Convert to WebP (Recommended)
```bash
# Install imagemagick or use online converter
convert attached_assets/generated_images/Nigerian_cuisine_hero_image_337661c0.png \
  -quality 85 \
  -resize 1920x1080 \
  attached_assets/generated_images/Nigerian_cuisine_hero_image_337661c0.webp
```

**Expected size**: ~200-400KB (95% reduction)

### Option 2: Use Cloudinary/CDN
If images are served from Cloudinary, the `OptimizedImage` component will automatically:
- Convert to WebP/AVIF
- Resize based on viewport
- Apply quality optimization
- Use responsive srcset

### Option 3: Optimize PNG
```bash
# Using pngquant
pngquant --quality=85-95 \
  attached_assets/generated_images/Nigerian_cuisine_hero_image_337661c0.png \
  --output attached_assets/generated_images/Nigerian_cuisine_hero_image_337661c0_optimized.png
```

**Expected size**: ~1-2MB (75% reduction)

### Option 4: Use Responsive Images
The `OptimizedImage` component already supports responsive images. Ensure:
- `width` and `height` attributes are set (prevents layout shift)
- `srcset` is generated for different screen sizes
- Lazy loading is disabled for hero (priority image)

## Implementation

The hero image is now configured to use Cloudinary URL with:
- `OptimizedImage` component - Automatically optimizes Cloudinary images
- `priority={true}` - Loads immediately
- `width={1920}` and `height={1080}` - Prevents layout shift
- Responsive sizing via CSS

## Next Steps

1. **Upload optimized image to Cloudinary**
   - Convert original PNG to WebP format
   - Target size: < 400KB
   - Quality: 85-90
   - Max width: 1920px
   - Upload to your Cloudinary account

2. **Update Cloudinary URL** in `src/pages/customer-menu.tsx`:
   ```typescript
   // Option 1: Update the constant directly
   const heroImage = "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/f_auto,q_85,w_1920/v1/nibbles-kitchen/hero-image";
   
   // Option 2: Use environment variable (recommended)
   // Add to .env file:
   // VITE_HERO_IMAGE_URL=https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/f_auto,q_85,w_1920/v1/nibbles-kitchen/hero-image
   ```

3. **Cloudinary Transformation Parameters** (already in URL):
   - `f_auto` - Automatic format (WebP/AVIF when supported)
   - `q_85` - Quality 85 (good balance)
   - `w_1920` - Max width 1920px (responsive)
   - Add `h_1080` if you want to constrain height

4. **Test LCP**
   - Should improve from 25.4s to < 2.5s
   - Network payload should reduce from 12.4MB to < 2MB

## Impact

| Metric | Before | After (Expected) | Improvement |
|--------|--------|-----------------|-------------|
| Hero Image Size | 8.2MB | ~300KB | 96% reduction |
| Network Payload | 12.4MB | ~4.4MB | 65% reduction |
| LCP | 25.4s | < 3s | 88% improvement |
| FCP | 13.0s | < 2s | 85% improvement |

---

**Status**: ⚠️ **ACTION REQUIRED** - Hero image needs to be optimized manually


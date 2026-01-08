/**
 * Image optimization utilities for Cloudinary and other image sources
 */

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'auto' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
}

/**
 * Check if URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Generate optimized Cloudinary URL with transformations
 * Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
 */
export function getOptimizedCloudinaryUrl(
  originalUrl: string,
  options: ImageOptions = {}
): string {
  if (!isCloudinaryUrl(originalUrl)) {
    return originalUrl; // Return original if not Cloudinary
  }

  const {
    width,
    height,
    quality = 80,
    format = 'auto', // Cloudinary auto format (WebP when supported)
    crop = 'fill',
  } = options;

  // Parse Cloudinary URL
  // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
  const urlParts = originalUrl.split('/upload/');
  
  if (urlParts.length !== 2) {
    return originalUrl; // Invalid Cloudinary URL format
  }

  const baseUrl = urlParts[0] + '/upload/';
  const publicId = urlParts[1];

  // Build transformation string
  const transformations: string[] = [];

  if (width) {
    transformations.push(`w_${width}`);
  }
  
  if (height) {
    transformations.push(`h_${height}`);
  }

  if (width || height) {
    transformations.push(`c_${crop}`);
  }

  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);

  // Add fetch format for better compression
  transformations.push('fl_progressive'); // Progressive JPEG
  transformations.push('fl_immutable_cache'); // Cache optimization

  const transformationString = transformations.join(',');
  return `${baseUrl}${transformationString}/${publicId}`;
}

/**
 * Generate responsive srcset for Cloudinary images
 */
export function generateCloudinarySrcSet(
  originalUrl: string,
  sizes: number[] = [400, 600, 800, 1200]
): string {
  if (!isCloudinaryUrl(originalUrl)) {
    return '';
  }

  return sizes
    .map((width) => {
      const optimizedUrl = getOptimizedCloudinaryUrl(originalUrl, {
        width,
        quality: 80,
        format: 'auto',
        crop: 'fill',
      });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Get image quality based on network status
 */
export function getQualityForNetwork(
  networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown',
  saveData: boolean
): number {
  if (saveData) {
    return 50; // Very low quality for data saver mode
  }

  switch (networkType) {
    case 'slow-2g':
    case '2g':
      return 50; // Low quality for 2G
    case '3g':
      return 65; // Medium quality for 3G
    case '4g':
    case 'unknown':
    default:
      return 80; // High quality for 4G or unknown (assume good)
  }
}

/**
 * Generate low-quality placeholder URL (LQIP)
 * Returns a very small, low-quality version for blur-up effect
 */
export function getPlaceholderUrl(originalUrl: string): string {
  if (!isCloudinaryUrl(originalUrl)) {
    return originalUrl; // Can't optimize non-Cloudinary URLs
  }

  return getOptimizedCloudinaryUrl(originalUrl, {
    width: 50,
    height: 50,
    quality: 20,
    format: 'auto',
    crop: 'fill',
  });
}

/**
 * Generate base64 data URL for blur placeholder
 * This is a simple colored placeholder - in production, you might want to
 * use a more sophisticated blur hash or actual low-res image
 */
export function generateBlurDataUrl(width: number = 400, height: number = 400): string {
  // Generate a simple gray placeholder
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#e5e7eb'; // Light gray
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
}


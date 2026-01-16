/**
 * Image optimization utilities for CDN and Cloudinary image sources
 */

import { getCDNImageUrl, isCDNUrl, isCloudinaryUrl as checkCDNUrl } from './cdnClient';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'auto' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
}

/**
 * Detect if running on iOS Safari (which may have WebP issues on older versions)
 */
function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * Get best image format for current browser
 * iOS Safari older versions have WebP issues, use JPEG as fallback
 */
function getBestFormat(): 'webp' | 'jpg' {
  // For iOS Safari, prefer JPEG for maximum compatibility
  if (isIOSSafari()) {
    return 'jpg';
  }
  return 'webp';
}

/**
 * Check if URL is a Cloudinary URL (legacy)
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Generate optimized image URL (CDN or Cloudinary)
 * Supports both Nibbles CDN (new) and Cloudinary (legacy)
 */
export function getOptimizedCloudinaryUrl(
  originalUrl: string,
  options: ImageOptions = {}
): string {
  // Determine best format based on browser
  const bestFormat = getBestFormat();
  
  // If CDN URL, use CDN client
  if (isCDNUrl(originalUrl)) {
    return getCDNImageUrl(originalUrl, {
      width: options.width,
      height: options.height,
      quality: options.quality || 80,
      format: options.format === 'auto' ? bestFormat : (options.format as 'webp' | 'jpg' | 'png' | undefined),
    });
  }

  // Legacy Cloudinary support
  if (!isCloudinaryUrl(originalUrl)) {
    return originalUrl; // Return original if not Cloudinary or CDN
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
  // Use best format for Cloudinary too
  transformations.push(`f_${format === 'auto' ? bestFormat : format}`);

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


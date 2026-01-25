/**
 * Image CDN Utility
 * Transforms image URLs to use CDN or Cloudinary with optimizations
 * Supports both Cloudinary (legacy) and Nibbles CDN (new)
 */

import { getCDNImageUrl, isCDNUrl, isCloudinaryUrl } from './cdnClient';

const CLOUDINARY_CLOUD_NAME = 'dv0gb0cy2';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Check if URL is a local/relative path
 */
function isLocalPath(url: string): boolean {
  return url.startsWith('/') || url.startsWith('./') || !url.includes('://');
}

/**
 * Transform image URL to optimized CDN URL (CDN or Cloudinary)
 * @param imageUrl - Original image URL
 * @param options - Optimization options
 * @returns Optimized CDN URL
 */
export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string {
  // Return placeholder if no URL
  if (!imageUrl) {
    return getPlaceholderImage();
  }

  // If CDN URL, use CDN client
  if (isCDNUrl(imageUrl)) {
    return getCDNImageUrl(imageUrl, {
      width: options.width,
      height: options.height,
      quality: options.quality || 80,
      format: options.format === 'auto' ? 'webp' : (options.format as 'webp' | 'jpg' | 'png' | undefined),
    });
  }

  // If already Cloudinary URL, just add optimizations (legacy support)
  if (isCloudinaryUrl(imageUrl)) {
    return addCloudinaryTransformations(imageUrl, options);
  }

  // If local path, return as-is (will be served by backend)
  if (isLocalPath(imageUrl)) {
    return imageUrl;
  }

  // For other URLs, try to fetch via Cloudinary fetch API (legacy)
  // This requires the image to be publicly accessible
  const encodedUrl = encodeURIComponent(imageUrl);
  const transformations = buildTransformations(options);
  return `${CLOUDINARY_BASE_URL}/f_auto,q_auto${transformations}/fetch/${encodedUrl}`;
}

/**
 * Add Cloudinary transformations to existing Cloudinary URL
 */
function addCloudinaryTransformations(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    gravity?: 'auto' | 'face' | 'center';
  }
): string {
  const transformations = buildTransformations(options);
  
  // Insert transformations before the image path
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transformations}/`);
  }
  
  return url;
}

/**
 * Build Cloudinary transformation string
 */
function buildTransformations(options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'face' | 'center';
}): string {
  const parts: string[] = [];

  // Format (auto selects best format based on browser)
  if (options.format && options.format !== 'auto') {
    parts.push(`f_${options.format}`);
  } else {
    parts.push('f_auto'); // Auto format (WebP/AVIF when supported)
  }

  // Quality
  if (options.quality) {
    parts.push(`q_${options.quality}`);
  } else {
    parts.push('q_auto'); // Auto quality
  }

  // Dimensions and crop
  if (options.width || options.height) {
    const crop = options.crop || 'fill';
    const gravity = options.gravity || 'auto';
    const width = options.width ? `w_${options.width}` : '';
    const height = options.height ? `h_${options.height}` : '';
    parts.push(`${width}${height ? ',' + height : ''},c_${crop},g_${gravity}`);
  }

  return parts.join(',');
}

/**
 * Get placeholder image for missing images
 */
export function getPlaceholderImage(width = 400, height = 400): string {
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"%3E%3Crect fill="%23ddd" width="${width}" height="${height}"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E`;
}

/**
 * Get responsive image srcset for different screen sizes
 */
export function getResponsiveImageSrcSet(
  imageUrl: string | null | undefined,
  baseWidth = 400
): string {
  if (!imageUrl) return '';

  const sizes = [400, 600, 800, 1200, 1600];
  return sizes
    .map(size => {
      const optimizedUrl = getOptimizedImageUrl(imageUrl, {
        width: size,
        format: 'auto',
        quality: 85,
      });
      return `${optimizedUrl} ${size}w`;
    })
    .join(', ');
}

/**
 * Get responsive image sizes attribute
 */
export function getResponsiveImageSizes(): string {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
}


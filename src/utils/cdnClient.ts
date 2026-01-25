/**
 * CDN Client Utility
 * Handles image uploads and URL generation for Nibbles CDN
 */

const CDN_BASE_URL = import.meta.env.VITE_CDN_URL || import.meta.env.VITE_CDN_BASE_URL || 'http://localhost:4000';
const CDN_API_KEY = import.meta.env.VITE_CDN_API_KEY || '';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
}

export interface CDNUploadResponse {
  id: string;
  filename: string;
  type: string;
  mimetype: string;
  size: number;
  url: string;
  originalName?: string;
}

/**
 * Upload image file to CDN
 * @param file - File object from input
 * @returns CDN URL
 */
export async function uploadToCDN(file: File): Promise<string> {
  if (!CDN_API_KEY) {
    throw new Error('CDN API key not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${CDN_BASE_URL}/assets`, {
      method: 'POST',
      headers: {
        'x-api-key': CDN_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    const data: CDNUploadResponse = await response.json();
    
    // Ensure full URL is returned
    const cdnUrl = data.url.startsWith('http')
      ? data.url
      : `${CDN_BASE_URL}${data.url}`;

    return cdnUrl;
  } catch (error: any) {
    console.error('Error uploading to CDN:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Get CDN image URL with optional transforms
 * @param filename - CDN filename (can be full URL or just filename)
 * @param options - Image transformation options
 * @returns Full CDN URL with transforms
 */
export function getCDNImageUrl(filename: string, options: ImageOptions = {}): string {
  if (!filename) {
    return getPlaceholderImage();
  }

  // If already a full CDN URL, preserve the base URL and add transforms
  if (isCDNUrl(filename) && filename.startsWith('http')) {
    if (Object.keys(options).length === 0) {
      return filename;
    }
    
    // Extract base URL and filename from the full URL
    const urlParts = filename.split('/media/images/');
    if (urlParts.length === 2) {
      const baseUrl = urlParts[0]; // e.g., https://server.brainstorm.ng/nibbleskitchen/cdn
      const filePart = urlParts[1].split('?')[0]; // Remove existing query params
      
      const params = new URLSearchParams();
      if (options.width) params.set('w', options.width.toString());
      if (options.height) params.set('h', options.height.toString());
      params.set('q', (options.quality || 80).toString());
      params.set('f', options.format || 'webp');
      
      const query = params.toString();
      return `${baseUrl}/media/images/${filePart}${query ? '?' + query : ''}`;
    }
    return filename;
  }

  // Extract filename from path if needed
  const cleanFilename = filename.includes('/') 
    ? filename.split('/').pop() || filename
    : filename;

  const params = new URLSearchParams();
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  params.set('q', (options.quality || 80).toString());
  params.set('f', options.format || 'webp');

  const query = params.toString();
  return `${CDN_BASE_URL}/media/images/${cleanFilename}${query ? '?' + query : ''}`;
}

/**
 * Check if URL is a CDN URL
 * @param url - URL to check
 * @returns true if CDN URL
 */
export function isCDNUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('/media/') || 
         url.includes(CDN_BASE_URL) || 
         (CDN_BASE_URL !== 'http://localhost:4000' && url.includes(CDN_BASE_URL));
}

/**
 * Check if URL is a Cloudinary URL (for migration purposes)
 * @param url - URL to check
 * @returns true if Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Get placeholder image URL
 * @returns Placeholder image URL
 */
export function getPlaceholderImage(): string {
  // Return a placeholder or default image
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5JbWFnZSBQbGFjZWhvbGRlcjwvdGV4dD48L3N2Zz4=';
}

/**
 * Migrate Cloudinary URL to CDN (client-side helper - actual migration should be server-side)
 * @param cloudinaryUrl - Cloudinary URL
 * @returns CDN URL (placeholder - actual migration happens server-side)
 */
export function migrateCloudinaryUrl(cloudinaryUrl: string): string {
  // This is just a placeholder - actual migration should be done server-side
  // This function can be used to detect Cloudinary URLs for migration
  console.warn('Cloudinary URL detected - migration should be done server-side:', cloudinaryUrl);
  return cloudinaryUrl;
}



import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  getOptimizedCloudinaryUrl,
  getPlaceholderUrl,
  generateCloudinarySrcSet,
  getQualityForNetwork,
  isCloudinaryUrl,
} from '@/utils/imageOptimization';
import { isCDNUrl } from '@/utils/cdnClient';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // If true, load immediately (for above-the-fold images)
  aspectRatio?: 'square' | 'auto';
  fallbackSrc?: string;
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Automatic WebP with fallback (JPEG for iOS Safari)
 * - Lazy loading (except for priority images)
 * - Progressive image loading with blur placeholder
 * - Network-aware quality adjustment
 * - Responsive srcset for different screen sizes
 * - Error handling with fallback to original URL
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  aspectRatio = 'square',
  fallbackSrc,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const networkStatus = useNetworkStatus();

  // Calculate dimensions based on aspect ratio
  // PERFORMANCE: Always provide explicit width/height to prevent layout shift
  const imageWidth = width || (aspectRatio === 'square' ? 400 : 1920);
  const imageHeight = height || (aspectRatio === 'square' ? 400 : 1080);

  // Get quality based on network status
  const effectiveType = (networkStatus.effectiveType as 'slow-2g' | '2g' | '3g' | '4g' | 'unknown') || 'unknown';
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  const saveData = connection?.saveData || false;
  const quality = getQualityForNetwork(
    effectiveType,
    saveData
  );

  useEffect(() => {
    if (!src) return;

    // Generate optimized URL
    let optimizedSrc = src;
    
    // Only apply transformations for Cloudinary URLs
    // For CDN URLs, use original URL directly (CDN handles optimization server-side)
    if (isCloudinaryUrl(src)) {
      optimizedSrc = getOptimizedCloudinaryUrl(src, {
        width: imageWidth,
        height: imageHeight,
        quality,
        format: 'auto', // Will use JPEG for iOS Safari
        crop: 'fill',
      });
    } else if (isCDNUrl(src)) {
      // For CDN URLs, use original URL without client-side transformation
      // The CDN server handles optimization via query params if needed
      optimizedSrc = src;
    }

    setImageSrc(optimizedSrc);
    setHasError(false);
    setIsLoaded(false);
    setShowPlaceholder(true);
    setRetryCount(0);
  }, [src, imageWidth, imageHeight, quality]);

  const handleLoad = () => {
    setIsLoaded(true);
    // Delay hiding placeholder for smooth transition
    setTimeout(() => {
      setShowPlaceholder(false);
    }, 100);
  };

  const handleError = () => {
    // On first error, try the original URL without any transformations
    if (retryCount === 0 && imageSrc !== src) {
      setRetryCount(1);
      setImageSrc(src);
      return;
    }
    
    // On second error, try fallback if available
    if (retryCount === 1 && fallbackSrc && fallbackSrc !== imageSrc) {
      setRetryCount(2);
      setImageSrc(fallbackSrc);
      return;
    }
    
    setHasError(true);
    setShowPlaceholder(false);
  };

  // Generate srcset for responsive images (Cloudinary only)
  const srcSet = isCloudinaryUrl(src)
    ? generateCloudinarySrcSet(src, [400, 600, 800, 1200])
    : undefined;

  // Generate sizes attribute for responsive images
  const sizes = aspectRatio === 'square'
    ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  // Placeholder URL for blur-up effect (Cloudinary only)
  const placeholderUrl = isCloudinaryUrl(src)
    ? getPlaceholderUrl(src)
    : undefined;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: aspectRatio === 'square' ? '1 / 1' : 'auto',
        width: '100%',
        height: aspectRatio === 'square' ? 'auto' : '100%',
      }}
    >
      {/* Blur Placeholder */}
      {showPlaceholder && placeholderUrl && (
        <img
          src={placeholderUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          style={{
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
            transition: 'opacity 0.3s ease-out',
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* Skeleton Placeholder (when no image available) */}
      {showPlaceholder && !placeholderUrl && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Main Image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={imageWidth}
        height={imageHeight}
        srcSet={srcSet}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${hasError ? 'hidden' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />

      {/* Error Fallback */}
      {hasError && (
        <div
          className="absolute inset-0 bg-muted flex items-center justify-center"
          role="img"
          aria-label={alt}
        >
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto text-muted-foreground mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-muted-foreground">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
}


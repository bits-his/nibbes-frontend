import { useState, useEffect, useRef } from 'react';

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

// Global cache: tracks which image URLs have been successfully loaded
const loadedImages = new Set<string>();

export function ImageWithSkeleton({ src, alt, className = '', containerClassName = '' }: ImageWithSkeletonProps) {
  const alreadyLoaded = loadedImages.has(src);
  const [isLoaded, setIsLoaded] = useState(alreadyLoaded);
  const [hasError, setHasError] = useState(false);
  const srcRef = useRef(src);

  // If src changes, check cache
  useEffect(() => {
    if (src !== srcRef.current) {
      srcRef.current = src;
      if (loadedImages.has(src)) {
        setIsLoaded(true);
        setHasError(false);
      } else {
        setIsLoaded(false);
        setHasError(false);
      }
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-muted ${containerClassName}`}>
      {/* Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        loading="lazy"
        onLoad={() => { loadedImages.add(src); setIsLoaded(true); }}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
}

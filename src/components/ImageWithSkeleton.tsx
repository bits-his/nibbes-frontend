import { useState } from 'react';

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export function ImageWithSkeleton({ src, alt, className = '', containerClassName = '' }: ImageWithSkeletonProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
}

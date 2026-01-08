import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  itemsPerLoad?: number; // Number of items to load each time
  enabled?: boolean; // Enable/disable infinite scroll
}

export interface UseInfiniteScrollReturn<T> {
  visibleItems: T[];
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  reset: () => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for infinite scroll pagination
 * Loads items as user scrolls, reducing initial payload
 */
export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn<T> {
  const {
    threshold = 200,
    itemsPerLoad = 12,
    enabled = true,
  } = options;

  const [visibleCount, setVisibleCount] = useState(itemsPerLoad);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simulate slight delay for smooth UX
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + itemsPerLoad, items.length));
      setIsLoading(false);
    }, 100);
  }, [isLoading, hasMore, itemsPerLoad, items.length]);

  const reset = useCallback(() => {
    setVisibleCount(itemsPerLoad);
    setIsLoading(false);
  }, [itemsPerLoad]);

  // Set up intersection observer for automatic loading
  useEffect(() => {
    if (!enabled || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, hasMore, isLoading, threshold, loadMore]);

  return {
    visibleItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
    sentinelRef,
  };
}


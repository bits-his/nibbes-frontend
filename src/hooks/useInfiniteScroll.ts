import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions {
  itemsPerLoad: number;
  threshold?: number;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  displayedItems: T[];
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  reset: () => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions
): UseInfiniteScrollReturn<T> {
  const { itemsPerLoad, threshold = 300, enabled = true } = options;
  
  const [displayedCount, setDisplayedCount] = useState(itemsPerLoad);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  const displayedItems = items.slice(0, displayedCount);
  const hasMore = displayedCount < items.length;
  
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || !enabled) return;
    
    setIsLoading(true);
    
    // Simulate async loading with a small delay for smooth UX
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + itemsPerLoad, items.length));
      setIsLoading(false);
    }, 100);
  }, [hasMore, isLoading, enabled, itemsPerLoad, items.length]);
  
  const reset = useCallback(() => {
    setDisplayedCount(itemsPerLoad);
    setIsLoading(false);
  }, [itemsPerLoad]);
  
  // Intersection Observer for auto-loading when sentinel comes into view
  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );
    
    observer.observe(sentinelRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [enabled, hasMore, isLoading, loadMore, threshold]);
  
  // Reset when items array changes
  useEffect(() => {
    reset();
  }, [items.length]);
  
  return {
    displayedItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
    sentinelRef,
  };
}

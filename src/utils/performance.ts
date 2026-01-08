/**
 * Performance monitoring utilities
 */

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  pageWeight?: number; // Total page weight in bytes
}

/**
 * Measure and log performance metrics
 */
export function measurePerformance(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {};

  if (typeof window !== 'undefined' && 'performance' in window) {
    const perfData = window.performance;

    // Measure Time to First Byte (TTFB)
    const navigation = perfData.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.ttfb = navigation.responseStart - navigation.requestStart;
    }

    // Measure page weight
    const resources = perfData.getEntriesByType('resource') as PerformanceResourceTiming[];
    const totalSize = resources.reduce((sum, resource) => {
      return sum + (resource.transferSize || 0);
    }, 0);
    metrics.pageWeight = totalSize;

    // Use Performance Observer for Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(
            (entry) => entry.name === 'first-contentful-paint'
          ) as PerformancePaintTiming;
          if (fcpEntry) {
            metrics.fcp = fcpEntry.startTime;
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Performance Observer not supported
      }

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Performance Observer not supported
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[];
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Performance Observer not supported
      }
    }
  }

  return metrics;
}

/**
 * Log performance metrics to console (for debugging)
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics) {
  if (process.env.NODE_ENV === 'development') {
    console.group('📊 Performance Metrics');
    if (metrics.fcp) {
      console.log(`First Contentful Paint: ${metrics.fcp.toFixed(2)}ms`);
    }
    if (metrics.lcp) {
      console.log(`Largest Contentful Paint: ${metrics.lcp.toFixed(2)}ms`);
    }
    if (metrics.ttfb) {
      console.log(`Time to First Byte: ${metrics.ttfb.toFixed(2)}ms`);
    }
    if (metrics.cls) {
      console.log(`Cumulative Layout Shift: ${metrics.cls.toFixed(4)}`);
    }
    if (metrics.pageWeight) {
      const sizeInMB = (metrics.pageWeight / (1024 * 1024)).toFixed(2);
      console.log(`Page Weight: ${sizeInMB} MB`);
    }
    console.groupEnd();
  }
}

/**
 * Check if page load is slow based on metrics
 */
export function isSlowLoad(metrics: PerformanceMetrics): boolean {
  const slowThresholds = {
    fcp: 3000, // 3 seconds
    lcp: 4000, // 4 seconds
    ttfb: 800, // 800ms
  };

  return (
    (metrics.fcp !== undefined && metrics.fcp > slowThresholds.fcp) ||
    (metrics.lcp !== undefined && metrics.lcp > slowThresholds.lcp) ||
    (metrics.ttfb !== undefined && metrics.ttfb > slowThresholds.ttfb)
  );
}


/**
 * Performance monitoring utilities
 * Tracks Web Vitals and other performance metrics
 */

export interface PerformanceMetrics {
  // Navigation Timing
  dns?: number;
  tcp?: number;
  ttfb?: number; // Time to First Byte
  download?: number;
  domInteractive?: number;
  domComplete?: number;
  loadComplete?: number;
  
  // Paint Timing
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  
  // Resource Timing
  totalResources?: number;
  totalResourceSize?: number;
  
  // Memory (if available)
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  
  // Custom
  timestamp: number;
  url: string;
}

/**
 * Measures current performance metrics
 */
export function measurePerformance(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {
    timestamp: Date.now(),
    url: window.location.href,
  };

  // Navigation Timing API
  if (performance.timing) {
    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    if (navigationStart) {
      metrics.dns = timing.domainLookupEnd - timing.domainLookupStart;
      metrics.tcp = timing.connectEnd - timing.connectStart;
      metrics.ttfb = timing.responseStart - navigationStart;
      metrics.download = timing.responseEnd - timing.responseStart;
      metrics.domInteractive = timing.domInteractive - navigationStart;
      metrics.domComplete = timing.domComplete - navigationStart;
      metrics.loadComplete = timing.loadEventEnd - navigationStart;
    }
  }

  // Paint Timing API - First Contentful Paint
  try {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      metrics.fcp = fcpEntry.startTime;
    }
  } catch (e) {
    // Paint timing not supported
  }

  // Largest Contentful Paint (LCP)
  try {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lastEntry = lcpEntries[lcpEntries.length - 1] as any;
      metrics.lcp = lastEntry.startTime;
    }
  } catch (e) {
    // LCP not supported
  }

  // Resource Timing
  try {
    const resources = performance.getEntriesByType('resource');
    metrics.totalResources = resources.length;
    metrics.totalResourceSize = resources.reduce((total, resource: any) => {
      return total + (resource.transferSize || 0);
    }, 0);
  } catch (e) {
    // Resource timing not supported
  }

  // Memory (Chrome only)
  const memoryInfo = (performance as any).memory;
  if (memoryInfo) {
    metrics.memory = {
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
    };
  }

  return metrics;
}

/**
 * Logs performance metrics to console in a readable format
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  console.group('📊 Performance Metrics');
  
  // Navigation Timing
  if (metrics.ttfb !== undefined) {
    console.log('⏱️  Navigation Timing:');
    console.log(`   DNS Lookup: ${metrics.dns?.toFixed(2)}ms`);
    console.log(`   TCP Connection: ${metrics.tcp?.toFixed(2)}ms`);
    console.log(`   TTFB (Time to First Byte): ${metrics.ttfb?.toFixed(2)}ms`);
    console.log(`   Download: ${metrics.download?.toFixed(2)}ms`);
    console.log(`   DOM Interactive: ${metrics.domInteractive?.toFixed(2)}ms`);
    console.log(`   DOM Complete: ${metrics.domComplete?.toFixed(2)}ms`);
    console.log(`   Load Complete: ${metrics.loadComplete?.toFixed(2)}ms`);
  }
  
  // Paint Timing
  console.log('🎨 Paint Timing:');
  if (metrics.fcp !== undefined) {
    console.log(`   FCP (First Contentful Paint): ${metrics.fcp.toFixed(2)}ms`);
    // FCP targets: Good < 1.8s, Needs Improvement < 3s, Poor >= 3s
    const fcpStatus = metrics.fcp < 1800 ? '✅ Good' : metrics.fcp < 3000 ? '⚠️ Needs Improvement' : '❌ Poor';
    console.log(`   FCP Status: ${fcpStatus}`);
  }
  
  if (metrics.lcp !== undefined) {
    console.log(`   LCP (Largest Contentful Paint): ${metrics.lcp.toFixed(2)}ms`);
    // LCP targets: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
    const lcpStatus = metrics.lcp < 2500 ? '✅ Good' : metrics.lcp < 4000 ? '⚠️ Needs Improvement' : '❌ Poor';
    console.log(`   LCP Status: ${lcpStatus}`);
  }
  
  // Resources
  if (metrics.totalResources !== undefined) {
    console.log('📦 Resources:');
    console.log(`   Total Resources: ${metrics.totalResources}`);
    if (metrics.totalResourceSize !== undefined) {
      const sizeMB = (metrics.totalResourceSize / (1024 * 1024)).toFixed(2);
      console.log(`   Total Size: ${sizeMB} MB`);
    }
  }
  
  // Memory
  if (metrics.memory) {
    console.log('💾 Memory Usage:');
    const usedMB = (metrics.memory.usedJSHeapSize! / (1024 * 1024)).toFixed(2);
    const totalMB = (metrics.memory.totalJSHeapSize! / (1024 * 1024)).toFixed(2);
    const limitMB = (metrics.memory.jsHeapSizeLimit! / (1024 * 1024)).toFixed(2);
    console.log(`   Used JS Heap: ${usedMB} MB`);
    console.log(`   Total JS Heap: ${totalMB} MB`);
    console.log(`   JS Heap Limit: ${limitMB} MB`);
  }
  
  console.groupEnd();
}

/**
 * Reports performance metrics to an analytics endpoint
 * @param metrics Performance metrics to report
 * @param endpoint Optional custom endpoint
 */
export function reportPerformanceMetrics(
  metrics: PerformanceMetrics,
  endpoint?: string
): void {
  const url = endpoint || '/api/analytics/performance';
  
  // Use sendBeacon for reliable delivery even on page unload
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(metrics)], {
      type: 'application/json',
    });
    navigator.sendBeacon(url, blob);
  } else {
    // Fallback to fetch
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
      keepalive: true,
    }).catch((error) => {
      console.error('Failed to report performance metrics:', error);
    });
  }
}

/**
 * Observes and reports Core Web Vitals
 * Should be called once on app initialization
 */
export function observeWebVitals(): void {
  // Observe LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('📈 LCP:', lastEntry.startTime.toFixed(2), 'ms');
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    // Not supported
  }

  // Observe FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        console.log('⚡ FID (First Input Delay):', fid.toFixed(2), 'ms');
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    // Not supported
  }

  // Observe CLS (Cumulative Layout Shift)
  try {
    let clsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
          console.log('📐 CLS (Cumulative Layout Shift):', clsScore.toFixed(4));
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    // Not supported
  }
}

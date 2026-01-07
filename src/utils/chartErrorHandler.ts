/**
 * Error handler for chart-related errors
 * Handles initialization errors from recharts vendor chunks
 */

export function handleChartError(error: Error, componentName: string = 'Chart') {
  // Check if it's a vendor chunk initialization error
  if (
    error.message?.includes("Cannot access") ||
    error.message?.includes("before initialization") ||
    error.stack?.includes("charts-vendor")
  ) {
    console.warn(
      `Chart component (${componentName}) initialization error detected. ` +
      `This may be due to a bundling issue. The chart may not render correctly.`,
      error
    );
    
    // Return a flag to indicate chart should be disabled
    return true;
  }
  
  return false;
}

/**
 * Safe wrapper for chart imports
 * Use this to dynamically import charts only when needed
 */
export async function safeImportCharts() {
  try {
    const recharts = await import('recharts');
    return { recharts, error: null };
  } catch (error: any) {
    console.error('Failed to load recharts:', error);
    return { recharts: null, error };
  }
}


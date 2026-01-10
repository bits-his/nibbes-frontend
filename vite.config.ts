import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname),
  optimizeDeps: {
    include: ['recharts'],
    exclude: [],
    esbuildOptions: {
      // Fix circular dependency issues with recharts
      keepNames: true,
      // Prevent circular dependency errors
      legalComments: 'none',
    },
  },
  build: {
    // PERFORMANCE: Optimize build output
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
      transformMixedEsModules: true,
      // Fix recharts circular dependency
      requireReturnsDefault: 'auto',
    },
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    manifest: true,
    // PERFORMANCE: Enable compression
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB (reduced for better optimization)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core libraries (critical - load first)
          if (id.includes('react') || id.includes('react-dom') || id.includes('wouter')) {
            return 'react-vendor';
          }
          
          // Radix UI components (large library - lazy load)
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // IMPORTANT: Don't split recharts - keep it in main bundle to avoid circular deps
          // Recharts has internal circular dependencies that break when code-split
          // Returning undefined means it stays in the main bundle
          if (id.includes('recharts') || id.includes('d3-')) {
            return undefined; // Keep in main bundle to avoid circular dependency issues
          }
          
          // PDF/Print libraries (lazy load - only used for printing)
          if (id.includes('@react-pdf') || id.includes('jspdf')) {
            return 'pdf-vendor';
          }
          
          // Form libraries (lazy load - only used in forms)
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms-vendor';
          }
          
          // Date utilities (lazy load)
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
          
          // Large utility libraries (lazy load)
          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'utils-vendor';
          }
          
          // Query/state management (lazy load)
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          
          // QR Code libraries (lazy load - only used in QR page)
          if (id.includes('qrcode') || id.includes('qrcode.react')) {
            return 'qrcode-vendor';
          }
        },
        hoistTransitiveImports: true,
        // PERFORMANCE: Optimize chunk names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // PERFORMANCE: Reduce chunk size by splitting more aggressively
        experimentalMinChunkSize: 20000, // 20KB minimum chunk size
      },
      external: [],
    },
    // SECURITY: Disable source maps in production for security and performance
    sourcemap: false, // Disable source maps in production (Lighthouse best practice)
    // PERFORMANCE: Use esbuild for faster minification with aggressive settings
    minify: 'esbuild', // Faster than terser
    target: 'es2020', // Modern browsers only
    cssCodeSplit: true, // Split CSS for better caching
    cssMinify: true, // Minify CSS
    // PERFORMANCE: Aggressive tree-shaking and dead code elimination
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});

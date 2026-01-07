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
      // Fix circular dependency issues
      keepNames: true,
    },
  },
  build: {
    // CommonJS options to handle circular dependencies better
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
      transformMixedEsModules: true,
    },
    outDir: path.resolve(import.meta.dirname, "dist"), // ✅ fixed here
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('wouter')) {
            return 'react-vendor';
          }
          
          // Radix UI components (large library)
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // IMPORTANT: Don't split recharts - keep it in main bundle to avoid circular deps
          // Recharts has internal circular dependencies that break when code-split
          // Returning undefined means it stays in the main bundle
          if (id.includes('recharts') || id.includes('d3-')) {
            return undefined; // Keep in main bundle to avoid circular dependency issues
          }
          
          // PDF/Print libraries
          if (id.includes('@react-pdf') || id.includes('jspdf')) {
            return 'pdf-vendor';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms-vendor';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
          
          // Large utility libraries
          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'utils-vendor';
          }
          
          // Query/state management
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
        },
        // Fix circular dependency issues
        hoistTransitiveImports: true,
      },
      // Externalize problematic dependencies if needed
      external: [],
    },
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Minify with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
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

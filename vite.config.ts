import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => ({
  plugins: [react(), svgr()],
  server: {
    port: 3000,   // so you don't break your Cognito / Lambda callbacks
    strictPort: true,
    open: true,
  },
  define: {
    // Only define process.env as empty object in dev mode
    // In production, Vite handles env vars securely
    ...(mode === 'development' && { 'process.env': {} })
  },
  build: {
    sourcemap: false, // Disable source maps in production for security
    rollupOptions: {
      output: {
        manualChunks: {
          // Code splitting for better performance - simplified to avoid lexical issues
          vendor: ['react', 'react-dom'],
          aws: ['aws-amplify'],
          ui: ['antd']
        }
      }
    },
    // Enable tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'aws-amplify'],
    exclude: ['@lexical/react', 'lexical'] // Let bundler handle these naturally
  },
  // Security: prevent exposing sensitive env vars
  envPrefix: 'VITE_'
}));
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

const devCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.amazonaws.com *.amplify.aws",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' data: fonts.gstatic.com",
  "img-src 'self' data: blob: *.amazonaws.com *.cloudfront.net https://tiles.stadiamaps.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org", // ← ✅ comma added here
  "media-src 'self' https: blob:",
  "connect-src 'self' http://localhost:* ws://localhost:* https://*.amazonaws.com https://*.amplify.aws wss://*.amazonaws.com https://nominatim.openstreetmap.org",
  "frame-ancestors 'none'",
].join('; ');

const prodCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' *.amazonaws.com *.amplify.aws",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' data: fonts.gstatic.com",
  "img-src 'self' data: https://d1cazymewvlm0k.cloudfront.net https://d2qb21tb4meex0.cloudfront.net *.amazonaws.com https://tiles.stadiamaps.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org ",
  "media-src 'self' https://d1cazymewvlm0k.cloudfront.net https://d2qb21tb4meex0.cloudfront.net *.amazonaws.com",
  "connect-src 'self' https://*.amazonaws.com https://*.amplify.aws wss://*.amazonaws.com https://nominatim.openstreetmap.org",
  "frame-ancestors 'none'",
].join('; ');


export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  const common = {
    plugins: [react(), svgr()],
    define: {
      // keeps libs that read process.env from blowing up in dev
      ...(isDev && { 'process.env': {} })
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            aws: ['aws-amplify'],
            ui: ['antd'],
          },
        },
      },
      minify: 'terser',
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'aws-amplify'],
      exclude: ['@lexical/react', 'lexical'],
    },
    envPrefix: 'VITE_',
  } as const;

  const securityHeaders = {
    'Content-Security-Policy': isDev ? devCsp : prodCsp,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  return {
    ...common,
    server: {
      port: 3000,
      strictPort: true,
      open: true,
      headers: securityHeaders, // <— dev headers (fixes CSP/XFO meta warnings)
    },
    preview: {
      headers: securityHeaders, // <— test prod-like headers with `vite preview`
    },
  };
});

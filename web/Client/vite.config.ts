import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import type { AddressInfo } from 'net';

const proxy = {
  '^/(api|auth|oauth)': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  },
};

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src'),
  publicDir: path.resolve(import.meta.dirname, 'src', 'public'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true, // Clears the dist folder before build
    rollupOptions: {
      input: [path.resolve(import.meta.dirname, 'src', 'index.html')],
    },
  },
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    {
      name: 'vite-plugin-log-requests',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          const isProxied = Object.keys(proxy).reduce(
            (acc, pathRegex) => acc || Boolean(url.match(pathRegex)),
            false,
          );
          if (!isProxied) {
            return next();
          }
          const addr = req.socket.address() as AddressInfo;
          console.log(
            `[${new Date().toISOString()} ${addr.address}:${addr.port}] ${req.method} ${res.statusCode} ${url}`,
          );
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 5000,
    proxy,
  },
});

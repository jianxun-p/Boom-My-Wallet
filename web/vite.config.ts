import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import type { AddressInfo } from 'net';


const proxy = {
	'^/(api|oauth)': {
		target: 'http://localhost:4000',
		changeOrigin: true,
	}
};


const inputHtmls = ['./Client/src/index.html']	

// https://vite.dev/config/
export default defineConfig({
	
	root: path.resolve(__dirname, 'Client', 'src'),
	publicDir: path.resolve(__dirname, 'Client', 'src', 'public'),
	build: {
		outDir: path.resolve(__dirname, 'Client', 'dist'), 
		emptyOutDir: true, // Clears the dist folder before build
        rollupOptions: {
			input: inputHtmls
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
					const url = req.url ?? "";
					const isProxied = Object.keys(proxy).reduce(
						(acc, pathRegex) => acc || Boolean(url.match(pathRegex)),
						false
					)
					if (!isProxied) {
						return next();
					}
					const addr = req.socket.address() as AddressInfo;
					console.log(`[${new Date().toISOString()} ${addr.address}:${addr.port}] ${req.method} ${res.statusCode} ${url}`);
					next();
				});
			},
		},
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./Client/src"),
		},
	},
	server: {
		port: 5000,
		proxy
	}
});

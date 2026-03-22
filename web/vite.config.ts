import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { globSync } from 'glob';


const globExclude: string[] = []; // file paths to be excluded
const inputHtmls = globSync('./Client/src/**/*.html')
	.filter(fn => globExclude.every(exclude => fn !== exclude));	

// https://vite.dev/config/
export default defineConfig({
	root: path.resolve(__dirname, 'Client', 'src'),
	publicDir: path.resolve(__dirname, 'Client', 'src', 'public'),
	build: {
		outDir: path.resolve(__dirname, 'Client', 'static'), 
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
	]
});

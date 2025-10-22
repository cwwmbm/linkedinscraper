import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0', // Allow external connections
		proxy: {
			'/api': {
				target: 'http://localhost:5001',
				changeOrigin: true,
				secure: false,
				// Don't rewrite the path - keep /api prefix since we now have /api routes in Flask
				rewrite: (path) => path
			}
		}
	}
});

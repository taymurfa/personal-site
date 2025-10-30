import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	server: {
		open: true
	},
	resolve: {
		alias: {
			'@': '/src'
		}
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					'three': ['three'],
					'react-three': ['@react-three/fiber', '@react-three/drei'],
					'react-vendor': ['react', 'react-dom']
				}
			}
		},
		chunkSizeWarningLimit: 1000
	}
});

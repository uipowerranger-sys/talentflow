import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Docker serves the app at /; GitHub Actions passes --base=/talentflow/ for Pages.
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://localhost:8000' } } });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the code to access process.env.API_KEY safely in the browser without crashing.
    // For the competition, users will likely use the manual key entry method, so we default this to empty.
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
  }
});
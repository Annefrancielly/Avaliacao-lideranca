import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento local, /api é repassado para o backend.
// Em produção (Docker), quem faz esse papel é o Nginx.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:8000',
    },
  },
});

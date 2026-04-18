import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Break the monolithic 9MB bundle into vendor chunks so HTTP/2 can
        // parallelize downloads and individual vendors cache independently.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Largest dep — Push UI kit pulls in walletconnect, wagmi, viem, etc.
          if (id.includes('@pushchain') || id.includes('walletconnect')) return 'vendor-pushchain';
          if (id.includes('@reown') || id.includes('@wagmi') || id.includes('viem')) return 'vendor-wallet';
          if (id.includes('ethers') || id.includes('@noble') || id.includes('@scure')) return 'vendor-ethers';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          if (id.includes('react-dom') || id.includes('scheduler')) return 'vendor-react-dom';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-icons') || id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('html-to-image') || id.includes('react-smooth')) return 'vendor-misc';
          return 'vendor';
        },
      },
    },
  },
});

import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Bundle splitting lesson learned the hard way: we previously split
// @reown/@wagmi/viem into a separate `vendor-wallet` chunk AWAY from
// @pushchain/ui-kit which imports them. That broke init order and produced
// a "Cannot access 'l9e' before initialization" TDZ error at load — the
// app silently white/black-screened because React never mounted.
//
// Rule going forward: only split chunks that are FULLY INDEPENDENT of each
// other. Never split a library away from things it imports at module-init
// time. We keep all wallet / SDK code in the main vendor chunk and only
// break out libraries we're confident don't cross-reference the core flow.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Safe to isolate — no cross-import with wallet stack:
          if (id.includes('@supabase'))   return 'vendor-supabase';
          if (id.includes('@tanstack'))   return 'vendor-tanstack';
          if (id.includes('react-icons')) return 'vendor-icons';
          if (id.includes('html-to-image')) return 'vendor-misc';
          // Everything else (React, react-dom, react-router, pushchain ui-kit,
          // @reown, @wagmi, viem, ethers, walletconnect, the crypto libs they
          // share) goes to one vendor chunk so Rollup preserves init order.
          return 'vendor';
        },
      },
    },
  },
});

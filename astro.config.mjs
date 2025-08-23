import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output : "static",
  site: "https://dealstudio.com.mx",
  integrations: [sitemap()],

  vite:{
    plugins: [
      tailwindcss()
    ]
  }
});
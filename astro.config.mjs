import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output : "static",
  site: "https://dealstudio.com.mx",
  integrations: [sitemap()],

  // Las páginas antiguas ahora se enfocan 100% en cámaras (SEO: 301 a home)
  redirects: {
    "/software": "/",
    "/seguridad": "/",
  },

  vite:{
    plugins: [
      tailwindcss()
    ]
  }
});
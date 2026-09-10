// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://macro-evidence.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  build: {
    format: 'file',
    inlineStylesheets: 'never',
  },
});

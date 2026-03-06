import { defineConfig } from 'vite'

export default defineConfig({
  // use a relative base so that the generated HTML and assets
  // work regardless of the URL at which the files are served.
  // this removes the hardcoded '/HungerDash/' prefix which caused
  // 404s when testing the `dist` folder locally.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

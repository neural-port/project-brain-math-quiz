import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// `base: './'` makes all asset paths relative so the build works on GitHub
// Pages project sites (https://<user>.github.io/<repo>/) without hardcoding
// the repo name.
export default defineConfig({
  plugins: [react()],
  base: './',
})

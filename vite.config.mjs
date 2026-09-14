import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// Vite replaced Vue CLI/webpack here on 2026-09-14, the last of the twelve
// apps to move that day (the recipe is no-thanks e817419, with cinemaroll
// ee3e00e for the bigger-app version). This app was the simplest case of the
// twelve, and the notes below are what that actually means:
//
//  - Nothing in src/ changed. Every `process.env.VUE_APP_*` read — the seven
//    Firebase keys, the TMDB key, and VUE_APP_VERSION behind the footer's
//    version line — is statically replaced by `define` below, exactly as
//    webpack's DefinePlugin did, so the source stays as it was.
//
//  - No service worker, then or now. The old vue.config.js carried a
//    BannerPlugin stamping "Current version" into service-worker.js, but
//    there was no `pwa` block and nothing ever generated that file, so the
//    plugin matched nothing: verified against a webpack build's dist/, which
//    has no service-worker.js at all. Dropped as dead config rather than
//    reproduced. If this app ever does want a worker, copy the
//    vite-plugin-pwa block out of a hub game, not this comment.
//
//  - The old `css.loaderOptions.sass.implementation: require('sass')` had
//    nothing else in it — no additionalData, no prependData — so there is no
//    globally injected partial to carry over. Vite drives `sass` directly.
//
//  - Routing is createWebHashHistory, so every route is a `#/...` fragment of
//    this one page and the S3/CloudFront side needs no rewrite rule.
//
// The file is `.mjs` rather than `.js` on purpose: package.json has no
// "type": "module" (src/assets/javascript/version.js, the deploy-time version
// bump, is CommonJS and stays so), while @vitejs/plugin-vue is ESM-only. The
// `.mjs` extension lets this one file be ESM without relabelling the package
// — the same split cinemaroll settled on.

export default defineConfig(({ mode }) => {
  // Same files and precedence Vue CLI used: .env, .env.local, .env.[mode],
  // .env.[mode].local, plus anything already on the shell. Only keys that are
  // actually set get a define, so an unset one stays `undefined` rather than
  // becoming the string "undefined" — firebase.js's config object should see
  // the shape it always saw.
  const env = loadEnv(mode, process.cwd(), 'VUE_APP_')

  const define = {}
  for (const [key, value] of Object.entries(env)) {
    define[`process.env.${key}`] = JSON.stringify(value)
  }

  return {
    base: '/',
    // Keeps the Vue CLI-era variable names working in .env files.
    envPrefix: ['VUE_APP_', 'VITE_'],
    define,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Vue CLI's dev server listened on 8080 on every interface, and Vite
      // restarts itself when .env changes, which is what the old nodemon
      // wrapper around `vue-cli-service serve` was for.
      port: 8080,
      host: true,
    },
    build: {
      // Vue CLI shipped source maps for the app bundles and they went to S3
      // with everything else; keep that.
      sourcemap: true,
      rollupOptions: {
        input: {
          app: fileURLToPath(new URL('./index.html', import.meta.url)),
        },
        output: {
          // Lowercase hex, like webpack's contenthash, and the same
          // js/ + css/ + img/ + fonts/ layout the old build wrote. Nothing in
          // this app reads bundle names back (it has no update check), but
          // keeping the layout means the S3 bucket's shape does not change.
          hashCharacters: 'hex',
          entryFileNames: 'js/[name].[hash].js',
          chunkFileNames: 'js/[name].[hash].js',
          assetFileNames: (info) => {
            const name = info.name || ''
            if (/\.css$/i.test(name)) return 'css/[name].[hash][extname]'
            if (/\.(woff2?|ttf|eot|otf)$/i.test(name)) return 'fonts/[name].[hash][extname]'
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(name)) return 'img/[name].[hash][extname]'
            return 'assets/[name].[hash][extname]'
          },
        },
      },
    },
    plugins: [vue()],
  }
})

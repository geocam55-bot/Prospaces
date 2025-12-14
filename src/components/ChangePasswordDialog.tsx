20:01:14.023 Running build in Washington, D.C., USA (East) – iad1
20:01:14.024 Build machine configuration: 2 cores, 8 GB
20:01:14.176 Cloning github.com/geocam55-bot/ProSpaces (Branch: main, Commit: d637d23)
20:01:14.737 Cloning completed: 561.000ms
20:01:14.862 Restored build cache from previous deployment (GwBesqwkL2dWZz6nfzFj4VcDsx6W)
20:01:15.408 Running "vercel build"
20:01:16.172 Vercel CLI 50.0.1
20:01:16.766 Installing dependencies...
20:01:36.976 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
20:01:37.616 npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
20:01:37.636 npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
20:01:37.702 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
20:01:37.707 npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
20:01:38.810 npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.
20:01:40.059 
20:01:40.060 > prospaces-crm@1.0.0 postinstall
20:01:40.060 > npm list tailwindcss || npm install tailwindcss tailwindcss-animate autoprefixer postcss
20:01:40.060 
20:01:40.682 prospaces-crm@1.0.0 /vercel/path0
20:01:40.682 ├─┬ tailwindcss-animate@1.0.7
20:01:40.683 │ └── tailwindcss@3.4.19 deduped
20:01:40.683 └── tailwindcss@3.4.19
20:01:40.683 
20:01:40.712 
20:01:40.713 > prospaces-crm@1.0.0 prepare
20:01:40.713 > husky install
20:01:40.713 
20:01:40.747 husky - Git hooks installed
20:01:40.763 
20:01:40.764 added 223 packages, removed 189 packages, and changed 9 packages in 24s
20:01:40.764 
20:01:40.764 95 packages are looking for funding
20:01:40.764   run `npm fund` for details
20:01:40.810 Running "npm run build"
20:01:40.940 
20:01:40.943 > prospaces-crm@1.0.0 build
20:01:40.944 > vite build
20:01:40.944 
20:01:41.359 [36mvite v5.4.21 [32mbuilding for production...[36m[39m
20:01:41.409 transforming...
20:01:44.622 [32m✓[39m 1515 modules transformed.
20:01:44.638 [31mx[39m Build failed in 3.25s
20:01:44.646 [31merror during build:
20:01:44.647 [31m[vite]: Rollup failed to resolve import "sonner@2.0.3" from "/vercel/path0/src/components/ChangePasswordDialog.tsx".
20:01:44.647 This is most likely unintended because it can break your application at runtime.
20:01:44.647 If you do want to externalize this module explicitly add it to
20:01:44.648 `build.rollupOptions.external`[31m
20:01:44.648     at viteWarn (file:///vercel/path0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:65855:17)
20:01:44.648     at onwarn (file:///vercel/path0/node_modules/@vitejs/plugin-react/dist/index.js:90:7)
20:01:44.648     at onRollupWarning (file:///vercel/path0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:65885:5)
20:01:44.648     at onwarn (file:///vercel/path0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:65550:7)
20:01:44.649     at file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:20975:13
20:01:44.649     at Object.logger [as onLog] (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:22848:9)
20:01:44.649     at ModuleLoader.handleInvalidResolvedId (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:21592:26)
20:01:44.649     at file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:21550:26[39m
20:01:44.690 Error: Command "npm run build" exited with 1

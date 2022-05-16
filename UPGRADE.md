# Upgrade Guide

## Migrating from Laravel Mix to Vite

> **Note:** This upgrade guide does not cover all possible Mix usages, such as Sass compilation. Please consult the [Vite documentation](https://vitejs.dev/guide/) for information on configuring Vite for these scenarios.

### Install Vite and the Laravel Plugin

First you will need to install Vite using your npm package manager of choice:

```shell
npm install --save-dev vite
```

You may also need to install additional Vite plugins for your project, such as the Vue or React plugins:

```shell
npm install --save-dev @vitejs/plugin-vue
```

**The following is only temporary until the package is published.**

The Laravel plugin for Vite is currently not published to NPM, so you will need to install and link it manually.

In another terminal, clone the plugin somewhere on your machine:

```shell
cd ~/Code/
git clone git@github.com:laravel-labs/vite-plugin-laravel.git
cd vite-plugin-laravel
```

Build the plugin:

```
npm run build
```

Then create an [npm link](https://docs.npmjs.com/cli/v8/commands/npm-link) so the plugin can be installed in your project:

```shell
npm link
```

Back in your project, install the plugin:

```shell
npm link --save-dev vite-plugin-laravel
```

### Configure Vite

Create a `vite.config.js` file in the root of your project:

```js
import { defineConfig } from 'vite'
import laravel from 'vite-plugin-laravel'
// import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        // Single entry point
        laravel('resources/js/app.js'),

        // Multiple entry points
        // laravel([
        //     'resources/js/app.js',
        //     'resources/js/other.js',
        // ]),

        // With SSR
        // laravel({
        //     input: 'resources/js/app.js',
        //     ssr: 'resources/js/ssr.js',
        // }),

        // If you are using the Vue plugin, you will need the following options:
        // vue({
        //     template: {
        //         transformAssetUrls: {
        //             base: '',
        //             includeAbsolute: false,
        //         },
        //     },
        // }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',

            // If you are using Ziggy (such as with Inertia) you will need this alias:
            // ziggy: 'vendor/tightenco/ziggy/dist/index.es.js',
        },
    },
})
```

### Update NPM Scripts

Update your NPM scripts in `package.json`:

```diff
 "scripts": {
-    "dev": "npm run development",
-    "development": "mix",
-    "watch": "mix watch",
-    "watch-poll": "mix watch -- --watch-options-poll=1000",
-    "hot": "mix watch --hot",
-    "prod": "npm run production",
-    "production": "mix --production"
+    "dev": "vite",
+    "build": "vite build"
 }
```

### Update environment variables

You will need to update the environment variables that are explicitly exposed in your `.env` files and in hosting environments such as Forge to use the `VITE_` prefix instead of `MIX_`:

```diff
-MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
-MIX_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
+VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
+VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

> **Note:** You may optionally maintain the `MIX_` prefix by [configuring Vite](https://vitejs.dev/config/#envprefix) to use it.

You will also need to update these references in your JavaScript code to use the new variable name and Vite syntax:

```diff
-    key: process.env.MIX_PUSHER_APP_KEY,
-    cluster: process.env.MIX_PUSHER_APP_CLUSTER,
+    key: import.meta.env.VITE_PUSHER_APP_KEY,
+    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
```

### Make your imports compatible with Vite

Vite only supports ES modules, so you will need to replace any `require()` statements with `import`, such as in your `app.js` and `bootstrap.js` files:

```diff
- require('./bootstrap');
+ import './bootstrap';
```

### Import your CSS from your JavaScript entrypoint(s)

Vite expects your CSS files to be imported via JavaScript, such as your `resources/js/app.js` entry point:

```js
import '../css/app.css'
```

### Replace `mix()` with `@vite()`

When using Vite, you will need to use the `@vite()` Blade directive instead of the `mix()` helper.

This will automatically detect whether you are running in serve or build mode and include all of the required `<script>` and `<link rel="stylesheet">` for you:

```diff
- <link rel="stylesheet" href="{{ mix('css/app.css') }}">
- <script src="{{ mix('css/app.js') }}" defer></script>
+ @vite('resources/js/app.js')
```

### Remove Laravel Mix

The Laravel Mix plugin can now be uninstalled:

```shell
npm remove laravel-mix
```

And you may remove your Mix configuration file:

```shell
rm webpack.mix.js
```

### Optional: Configure Tailwind

If you are using Tailwind, perhaps with one of Laravel's starter kits, you will need a `postcss.config.js` file.

Tailwind can generate this for you automatically:

```shell
npx tailwindcss init -p
```

Or you can create it manually:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Optional: Git ignore the build directory

Vite will place all of your build assets into a `build` subdirectory inside your public directory. If you prefer not to build your assets on deploy instead of committing them to your repository, then you may wish to add this directory to your `.gitignore` file:

```gitignore
/public/build
```

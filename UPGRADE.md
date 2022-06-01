# Upgrade Guide

## Migrating from Laravel Mix to Vite

> **Note:** This upgrade guide does not cover all possible Mix usages, such as Sass compilation. Please consult the [Vite documentation](https://vitejs.dev/guide/) for information on configuring Vite for these scenarios.

### Install Vite and the Laravel Plugin

First you will need to install [Vite](https://vitejs.dev/) and the [Laravel Vite Plugin](https://www.npmjs.com/package/laravel-vite-plugin) using your npm package manager of choice:

```shell
npm install --save-dev vite laravel-vite-plugin
```

You may also need to install additional Vite plugins for your project, such as the Vue or React plugins:

```shell
# Vue
npm install --save-dev @vitejs/plugin-vue

# React
npm install --save-dev @vitejs/plugin-react
```

### Configure Vite

Create a `vite.config.js` file in the root of your project:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
// import react from '@vitejs/plugin-react'
// import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        laravel(),
        // react(),
        // vue({
        //     template: {
        //         transformAssetUrls: {
        //             base: null,
        //             includeAbsolute: false,
        //         },
        //     },
        // }),
    ],
})
```

If your entry point is not `resources/js/app.js`, you should read the [entry point docs](https://github.com/laravel/vite-plugin/blob/docs/docs/vite.md#entry-points) to learn how to configure the Laravel plugin for your project.

### Update NPM Scripts

Update your NPM scripts in `package.json`:

```diff
  "scripts": {
-     "dev": "npm run development",
-     "development": "mix",
-     "watch": "mix watch",
-     "watch-poll": "mix watch -- --watch-options-poll=1000",
-     "hot": "mix watch --hot",
-     "prod": "npm run production",
-     "production": "mix --production"
+     "dev": "vite",
+     "build": "vite build"
  }
```

### Make your imports compatible with Vite

Vite only supports ES modules, so if you are upgrading an existing application you will need to replace any `require()` statements with `import`. You may refer to [this PR](https://github.com/laravel/laravel/pull/5895/files) for an example.

#### Inertia

Inertia makes use of a `require()` call that is more complex to replicate with Vite.

The following function can be used instead:

```diff
+ import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'

  createInertiaApp({
      title: (title) => `${title} - ${appName}`,
-     resolve: (name) => require(`./Pages/${name}.vue`),
+     resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
      setup({ el, app, props, plugin }) {
          return createApp({ render: () => h(app, props) })
              .use(plugin)
              .mixin({ methods: { route } })
              .mount(el);
      },
  });
```

### Update environment variables

You will need to update the environment variables that are explicitly exposed in your `.env` files and in hosting environments such as Forge to use the `VITE_` prefix instead of `MIX_`:

```diff
- MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
- MIX_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
+ VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
+ VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

> **Note:** You may optionally maintain the `MIX_` prefix by [configuring Vite](https://vitejs.dev/config/#envprefix) to use it.

You will also need to update these references in your JavaScript code to use the new variable name and Vite syntax:

```diff
-    key: process.env.MIX_PUSHER_APP_KEY,
-    cluster: process.env.MIX_PUSHER_APP_CLUSTER,
+    key: import.meta.env.VITE_PUSHER_APP_KEY,
+    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
```

### Import your CSS from your JavaScript entry point(s)

Vite expects your CSS files to be imported via JavaScript, such as your `resources/js/app.js` entry point:

```js
import '../css/app.css'
```

### Replace `mix()` with `@vite`

When using Vite, you will need to use the `@vite` Blade directive instead of the `mix()` helper.

This will automatically detect whether you are running in serve or build mode and include all of the required `<script>` and `<link rel="stylesheet">` for you:

```diff
- <link rel="stylesheet" href="{{ mix('css/app.css') }}">
- <script src="{{ mix('js/app.js') }}" defer></script>
+ @vite
```

If your entry point is not `resources/js/app.js`, you should read the [entry point docs](https://github.com/laravel/vite-plugin/blob/docs/docs/vite.md#entry-points) to learn how to use the `@vite` directive with different entry points.

#### React

If you are using React and hot-module replacement, you will need to include an additional directive *before* the `@vite` directive:

```html
@viteReactRefresh
@vite
```

This loads a React "refresh runtime" in development mode only, which is required for hot module replacement to work correctly.

### JavaScript files containing JSX must use a `.jsx` extension

You will need to rename any `.js` files containing JSX to instead have a `.jsx` extension. If you need to rename your entry point then you should read the [entry point docs](https://github.com/laravel/vite-plugin/blob/docs/docs/vite.md#entry-points) to learn how to configure the Laravel plugin for your project.

See [this tweet](https://twitter.com/youyuxi/status/1362050255009816577) from Vite's creator for more information.

> **Note:** If you are using Tailwind, remember to update the paths in your `tailwind.config.js` file.

### Remove Laravel Mix

The Laravel Mix package can now be uninstalled:

```shell
npm remove laravel-mix
```

And you may remove your Mix configuration file:

```shell
rm webpack.mix.js
```

If you are using StyleCI and have ignored the `webpack.mix.js` file in your configuration, you may also like to remove the ignore rule.

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

If you are using other PostCSS plugins, such as `postcss-import`, you will need to include them in your configuration.

### Optional: Git ignore the build directory

Vite will place all of your build assets into a `build` subdirectory inside your public directory. If you prefer to build your assets on deploy, instead of committing them to your repository, then you may wish to add this directory to your `.gitignore` file:

```gitignore
/public/build
```

### Optional: Update SSR configuration

You may remove your dedicated Laravel Mix SSR configuration:

```shell
rm webpack.ssr.mix.js
```

In most cases you won't need a dedicated SSR configuration file with Vite. If your SSR entry point is not `resources/js/ssr.js`, you should read the [entry point docs](https://github.com/laravel/vite-plugin/blob/docs/docs/vite.md#entry-points) to learn how to configure the Laravel plugin for your project.

You may wish to add the following additional scripts to your `package.json`:

```diff
  "scripts": {
      "dev": "vite",
-     "build": "vite build"
+     "build": "vite build",
+     "ssr:build": "vite build --ssr",
+     "ssr:serve": "node storage/ssr/ssr.js"
  }
```

If you prefer to build your assets on deploy, instead of committing them to your repository, then you may wish to add the SSR output directory to your `.gitignore` file:

```gitignore
/storage/ssr
```

## Migrating from Vite to Laravel Mix

### Install Laravel Mix

First you will need to install Laravel Mix using your npm package manager of choice:

```shell
npm install --save-dev laravel-mix
```

### Configure Mix

Create a `webpack.mix.js` file in the root of your project:

```
const mix = require('laravel-mix');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel applications. By default, we are compiling the CSS
 | file for the application as well as bundling up all the JS files.
 |
 */

mix.js('resources/js/app.js', 'public/js')
    .postCss('resources/css/app.css', 'public/css', [
        //
    ]);
```

### Update NPM Scripts

Update your NPM scripts in `package.json`:

```diff
  "scripts": {
-     "dev": "vite",
-     "build": "vite build"
-     "ssr:build": "vite build --ssr",
-     "ssr:serve": "node storage/ssr/ssr.js"
+     "dev": "npm run development",
+     "development": "mix",
+     "watch": "mix watch",
+     "watch-poll": "mix watch -- --watch-options-poll=1000",
+     "hot": "mix watch --hot",
+     "prod": "npm run production",
+     "production": "mix --production"
  }
```

#### Inertia

Vite requires a helper function to import page components which is not required with Laravel Mix.

You can remove this as follows:

```diff
- import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'

  createInertiaApp({
      title: (title) => `${title} - ${appName}`,
-     resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
+     resolve: (name) => require(`./Pages/${name}.vue`),
      setup({ el, app, props, plugin }) {
          return createApp({ render: () => h(app, props) })
              .use(plugin)
              .mixin({ methods: { route } })
              .mount(el);
      },
  });
```

### Update environment variables

You will need to update the environment variables that are explicitly exposed in your `.env` files and in hosting environments such as Forge to use the `MIX_` prefix instead of `VITE_`:

```diff
- VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
- VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
+ MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
+ MIX_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

You will also need to update these references in your JavaScript code to use the new variable name and Node syntax:

```diff
-    key: import.meta.env.VITE_PUSHER_APP_KEY,
-    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
+    key: process.env.MIX_PUSHER_APP_KEY,
+    cluster: process.env.MIX_PUSHER_APP_CLUSTER,
```

### Remove CSS imports from your JavaScript entry point(s)

If you are importing your CSS via JavaScript, you will need to remove them:

```js
- import '../css/app.css'
```

### Replace `@vite` with `mix()`

You will need to replace the `@vite` Blade directive with `<script>` and `<link rel="stylesheet">` tags and the `mix()` helper:

```diff
- @viteReactRefresh
- @vite
+ <link rel="stylesheet" href="{{ mix('css/app.css') }}">
+ <script src="{{ mix('js/app.js') }}" defer></script>
```

### Remove Vite and the Laravel Plugin

Vite and the Laravel Plugin can now be uninstalled:

```shell
npm remove vite laravel-vite-plugin
```

And you may remove your Vite configuration file:

```shell
rm vite.config.js
```

You may also wish to remove any `.gitignore` paths you are no longer using:

```gitignore
- /public/build
- /storage/ssr
```

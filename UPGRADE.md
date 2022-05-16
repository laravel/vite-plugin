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

            // If you are using Ziggy (such as with Inertia) and SSR you will need this alias:
            // ziggy: 'vendor/tightenco/ziggy/dist/index.es.js',
        },
    },
})
```

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

Vite only supports ES modules, so you will need to replace any `require()` statements with `import`.

Example `app.js`:

```diff
- require('./bootstrap');
+ import './bootstrap';
```

Example `bootstrap.js`:
```diff
- window._ = require('lodash');
+ import _ from 'lodash';
+ window._ = _;

  /**
   * We'll load the axios HTTP library which allows us to easily issue requests
   * to our Laravel back-end. This library automatically handles sending the
   * CSRF token as a header based on the value of the "XSRF" token cookie.
   */

- window.axios = require('axios');
+ import axios from 'axios';
+ window.axios = axios;

  window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

  /**
   * Echo exposes an expressive API for subscribing to channels and listening
   * for events that are broadcast by Laravel. Echo and event broadcasting
   * allows your team to easily build robust real-time web applications.
   */

+ // import Pusher from 'pusher-js';
  // import Echo from 'laravel-echo';

- // window.Pusher = require('pusher-js');
+ // window.Pusher = Pusher;

  // window.Echo = new Echo({
  //     broadcaster: 'pusher',
  //     key: process.env.MIX_PUSHER_APP_KEY,
  //     cluster: process.env.MIX_PUSHER_APP_CLUSTER,
  //     forceTLS: true
  // });
```

#### Inertia

Inertia makes use of a `require()` call that is more complex to replicate with Vite.

The following function can be used instead:

```js
function resolvePageComponent(name, pages) {
    for (const path in pages) {
        if (path.endsWith(`${name.replace('.', '/')}.vue`)) {
            return typeof pages[path] === 'function'
                ? pages[path]()
                : pages[path]
        }
    }

    throw new Error(`Page not found: ${name}`)
}
```

```diff
  createInertiaApp({
      title: (title) => `${title} - ${appName}`,
-     resolve: (name) => require(`./Pages/${name}.vue`),
+     resolve: (name) => resolvePageComponent(name, import.meta.glob('./Pages/**/*.vue')),
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

If you are manually including the HMR bundle, you can remove this as well:

```diff
- @env ('local')
-     <script src="http://localhost:8080/js/bundle.js"></script>
- @endenv
```

#### React

If you are using React and hot-module replacement, you will need to include an additional directive *before* the `@vite` directive:

```html
@viteReactRefresh
@vite('resources/js/app.js')
```

This loads a React "refresh runtime" in development mode only, which is required for hot module replacement to work correctly.

### JavaScript files containing JSX must use a `.jsx` extension

You will need to rename any `.js` files containing JSX to instead have a `.jsx` extension.

See [this tweet](https://twitter.com/youyuxi/status/1362050255009816577) from Vite's creator for more information.

> **Note:** If you are using Tailwind, remember to update the paths in your `tailwind.config.js` file.

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

#### PostCSS Import

If you are using other PostCSS plugins, such as `postcss-import`, you will need to include them in your configuration.

If you were only using `postcss-import` to import Tailwind, then you may import Tailwind as follows:

```diff
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
+ @tailwind base
+ @tailwind components
+ @tailwind utilities
```

And then remove the plugin:

```shell
npm remove postcss-import
```

### Optional: Git ignore the build directory

Vite will place all of your build assets into a `build` subdirectory inside your public directory. If you prefer not to build your assets on deploy instead of committing them to your repository, then you may wish to add this directory to your `.gitignore` file:

```gitignore
/public/build
```

### Optional: Update SSR configuration

In your `vite.config.js` you can specify your SSR entry point by passing an configuration object to the `laravel` plugin:

```js
laravel({
    input: 'resources/js/app.js',
    ssr: 'resources/js/ssr.js',
})
```

In most cases you won't need a dedicated SSR configuration file. You may also remove your dedicated Laravel Mix SSR configuration:

```shell
rm webpack.ssr.mix.js
```

You may now add additional scripts to your `package.json`:

```diff
  "scripts": {
      "dev": "vite",
-     "build": "vite build"
+     "build": "vite build",
+     "ssr:build": "vite build --ssr",
+     "ssr:serve": "node storage/framework/ssr/ssr.js"
  }
```

# Compiling Assets (Vite)

- [Introduction](#introduction)
  - [Choosing Between Vite and Laravel Mix](#vite-or-mix)
- [Installation & Setup](#installation)
- [Running Vite](#running-vite)
- [Working With JavaScript](#working-with-scripts)
  - [Entry Points](#entry-points)
  - [Vue](#vue)
  - [React](#react)
  - [URL Processing](#url-processing)
- [Working With Stylesheets](#working-with-stylesheets)
  - [PostCSS](#postcss)
  - [Tailwind CSS](#tailwindcss)
  - [Pre-processors](#pre-processors)
- [Custom Base URLs](#custom-base-urls)
- [Environment Variables](#environment-variables)
- [Server-Side Rendering (SSR)](#ssr)

<a name="introduction"></a>
## Introduction

[Vite](https://vitejs.dev) is a modern frontend build tool that provides an extremely fast development environment and bundles your code for production.

Laravel integrates seamlessly with Vite by providing an official plugin and Blade directive to load your assets for development and production.

<a name="vite-or-mix"></a>
### Choosing Between Vite and Laravel Mix

// TODO

<a name="installation"></a>
## Installation & Setup

### Installing Node

Before running Vite and the Laravel Vite Plugin, you must first ensure that Node.js and NPM are installed on your machine:

```sh
node -v
npm -v
```

You can easily install the latest version of Node and NPM using simple graphical installers from [the official Node website](https://nodejs.org/en/download/). Or, if you are using [Laravel Sail](https://laravel.com/docs/{{version}}/sail), you may invoke Node and NPM through Sail:

```sh
./sail node -v
./sail npm -v
```

### Installing Vite and the Laravel Vite Plugin

The only remaining step is to install your npm dependencies. Within a fresh installation of Laravel, you'll find a `package.json` file in the root of your directory structure. The default `package.json` file already includes everything you need to get started using Vite and the Laravel Vite Plugin. Think of this file like your `composer.json` file, except it defines Node dependencies instead of PHP dependencies. You may install the dependencies it references by running:

```sh
npm install
```

<a name="running-vite"></a>
## Running Vite

There are two ways you can run Vite. You may run the development server, which is useful while you are developing locally. It will automatically detect changes to your files and those changes will be instantly reflected in any open browser windows.

Running the build command on the other hand will version and bundle your application's assets and get them ready for you to deploy to production.

```shell
// Run the Vite development server
npm run dev

// Build and version the assets for production
npm run build
```

<a name="working-with-scripts"></a>
## Working With JavaScript

<a name="entry-points"></a>
### Entry Points

Out of the box the Laravel plugin will look for your entry point at `resources/js/app.js`, so with that file in place, the only thing you will need to do is add the `@vite` directive to the `<head>` of your application.

```blade
<!doctype html>
<head>
    <!-- ... -->

    @vite
</head>
```

If you would like to change the default entry point to your application, you should pass the path to the Laravel plugin in your `vite.config.js`. Entry points may be JavaScript, TypeScript, JSX, or TSX files.

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'

export default defineConfig({
    plugins: [
        laravel('resources/js/entry-point.js'),
    ],
})
```

The compiled entry point can then be loaded by specifying the same path in the `@vite` Blade directive...

```blade
@vite('resources/js/entry-point.js')
```

If you have multiple entry points, you can also pass an array of paths to the Laravel plugin:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'

export default defineConfig({
    plugins: [
        laravel([
            'resources/js/app.js',
            'resources/js/admin.js',
        ]),
    ],
})
```

### Aliases

The Laravel plugin comes with two common aliases to help you hit the ground running, with the Ziggy alias only being applied if it is installed.

```sh
{
    '@' => 'resources/js',
    'ziggy' => 'vendor/tightenco/ziggy/dist/index.es.js'
}
```

You may overwrite the `"@"` alias by adding your own too the `vite.config.js`...

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'

export default defineConfig({
    plugins: [
        laravel('resources/ts/app.tsx')
    ],
    resolve: {
        alias: {
            '@': 'resources/ts',
        }
    }
})
```

<a name="vue"></a>
### Vue

There are a few additional options you may want when using Vue with Laravel:

// TODO: expand on _why_

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        laravel(),

        vue({
            template: {
                transformAssetUrls: {
                    base: '',
                    includeAbsolute: false,
                },
            },
        }),
    ],
})
```

<a name="react"></a>
### React

When using Vite with React, you will need to ensure that you any files that contain JSX have the `.jsx` or `.tsx` extension, remembering to update you entry point, if required, as [shown above](#entry-points).

```blade
@viteReactRefresh
@vite('resources/js/app.jsx')
```

The `@viteReactRefresh` directive must be called before the `@vite` directive.


<a name="url-processing"></a>
### URL Processing

// TODO

<a name="working-with-stylesheets"></a>
## Working With Stylesheets

When using Vite, it is recommended to import your stylesheets from within your JavaScript files:

```js
import '../css/app.css'
```

When you import the JavaScript using the `@vite` Blade directive, Laravel will automatically load any stylesheets referenced in those files for you.

You can learn more about Vite's CSS support on the [Vite docs](https://vitejs.dev/guide/features.html#css).

<a name="postcss"></a>
### PostCSS

Vite supports PostCSS out of the box, however you will want to specify your PostCSS configuration e.g. via a `postcss.config.js`.

```js
module.exports = {
    plugins: {
        autoprefixer: {},
        // ...
    }
}
```

<a name="tailwindcss"></a>
### Tailwind CSS

As Tailwind utilises PostCSS under the hood, it is supported by Vite without any additional plugins. Just ensure you have PostCSS configured [as shown above](#postcss).

<a name="pre-processors"></a>
### Pre-processors

Vite does also supports CSS pre-processors. You should read the [Vite docs](https://vitejs.dev/guide/features.html#css-pre-processors) for more information.

<a name="custom-base-urls"></a>
## Custom Base URLs

If your Vite compiled assets are deployed to a different domain separate from your application e.g. via a CDN, you will need to change the base URL generated by the `@vite` directive. You may do so by specifying the `ASSET_URL` environment variable:

```
ASSET_URL=https://cdn.example.com
```

After configuring the asset URL, the `@vite` directive will now prefix the configured URL when generating URLs to assets:

```
https://cdn.example.com/build/assets/app.9dce8d17.js
```

<a name="environment-variables"></a>
## Environment Variables

You may inject environment variables into your JavaScript by prefixing them with `VITE_` in your `.env` file:

```env
VITE_SENTRY_DSN_PUBLIC=http://example.com
```

After the variable has been defined in your `.env` file, you may access it via the `import.meta.env` object. However, you will need to restart the task if the environment variable's value changes while the task is running:

```js
import.meta.env.VITE_SENTRY_DSN_PUBLIC
```

<a name="ssr"></a>
## Server-Side Rendering (SSR)

The Laravel Vite Plugin makes it painless to set up Server-Side Rending. You can get started by expanding the plugin configuration and adding the SSR entry point:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.js',
            ssr: 'resources/js/ssr.js',
        }),
    ],
})
```

Then to build and start the SSR server, you may run the following commands...

```sh
npm run ssr:build
npm run ssr:serve
```

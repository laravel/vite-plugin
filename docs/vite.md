# Compiling Assets (Vite)

- [Introduction](#introduction)
  - [Choosing Between Vite and Laravel Mix](#vite-or-mix)
- [Installation & Setup](#installation)
- [Running Vite](#running-vite)
- [Working With JavaScript](#working-with-scripts)
- [Working With Stylesheets](#working-with-stylesheets)
- [Versioning / Cache Busting](#versioning-and-cache-busting)
- [Environment Variables](#environment-variables)
- [Server-Side Rendering (SSR)](#ssr)


- [Static Assets](#static-assets)


<a name="introduction"></a>
## Introduction

[Vite](https://vitejs.dev) is a modern frontend build tool that provides an extremely fast development environment and bundles your code for production.

Laravel integrates seamlessly with Vite by providing an official plugin and Blade directive to load your assets for development and production.

<a name="vite-or-mix"></a>
### Choosing Between Vite and Laravel Mix

// TODO

<a name="installation"></a>
## Installation & Setup

// TODO

<a name="running-vite"></a>
## Running Vite

```shell
// Run the Vite development server
npm run dev

// Build and version the assets
npm run build
```

<a name="working-with-scripts"></a>
## Working With JavaScript

To get started, you'll need to configure your JavaScript entry point with the Laravel plugin in your `vite.config.js`:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'

export default defineConfig({
    plugins: [
        laravel('resources/js/app.js'),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
})
```

Entry points may also be TypeScript, JSX, or TSX files. You may also include your own additional Vite configuration, such as the common `@` resolve alias above.

If you have multiple entry points, you can pass an array of paths:

```js
laravel([
    'resources/js/app.js',
    'resources/js/admin.js',
]),
```

<a name="working-with-stylesheets"></a>
## Working With Stylesheets

// TODO

<a name="versioning-and-cache-busting"></a>
## Versioning / Cache Busting

// TODO

<a name="environment-variables"></a>
## Environment Variables

// TODO

<a name="ssr"></a>
## Server-Side Rendering (SSR)

// TODO

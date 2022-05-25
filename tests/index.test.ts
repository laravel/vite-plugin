import { describe, expect, it } from 'vitest'
import laravel from '../src'

describe('laravel-vite-plugin', () => {
    it('accepts a single input', () => {
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('public/build')
        expect(config.build?.rollupOptions?.input).toBe('resources/js/app.js')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' })

        expect(ssrConfig.base).toBe('/build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('storage/ssr')
        expect(ssrConfig.build?.rollupOptions?.input).toBe('resources/js/app.js')
    })

    it('accepts an array of inputs', () => {
        const plugin = laravel([
            'resources/js/app.js',
            'resources/js/other.js',
        ])

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('public/build')
        expect(config.build?.rollupOptions?.input).toEqual(['resources/js/app.js', 'resources/js/other.js'])

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' })

        expect(ssrConfig.base).toBe('/build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('storage/ssr')
        expect(ssrConfig.build?.rollupOptions?.input).toEqual(['resources/js/app.js', 'resources/js/other.js'])
    })

    it('accepts a full configuration', () => {
        const plugin = laravel({
            input: 'resources/js/app.js',
            publicDirectory: 'other-public',
            buildDirectory: 'other-build',
            ssr: 'resources/js/ssr.js',
            ssrOutputDirectory: 'other-ssr-output',
        })

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/other-build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('other-public/other-build')
        expect(config.build?.rollupOptions?.input).toBe('resources/js/app.js')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' })

        expect(ssrConfig.base).toBe('/other-build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('other-ssr-output')
        expect(ssrConfig.build?.rollupOptions?.input).toBe('resources/js/ssr.js')
    })

    it('accepts a partial configuration', () => {
        const plugin = laravel({
            input: 'resources/js/app.js',
            ssr: 'resources/js/ssr.js',
        })

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('public/build')
        expect(config.build?.rollupOptions?.input).toBe('resources/js/app.js')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' })

        expect(ssrConfig.base).toBe('/build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('storage/ssr')
        expect(ssrConfig.build?.rollupOptions?.input).toBe('resources/js/ssr.js')
    })

    it('prefixes the base with ASSET_URL', () => {
        process.env.ASSET_URL = 'http://example.com'
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(config.base).toBe('http://example.com/build/')

        delete process.env.ASSET_URL
    })

    it('prevents setting an empty publicDirectory', () => {
        expect(() => laravel({ publicDirectory: '' }))
            .toThrowError('publicDirectory must be a subdirectory');
    })

    it('prevents setting an empty buildDirectory', () => {
        expect(() => laravel({ buildDirectory: '' }))
            .toThrowError('buildDirectory must be a subdirectory');
    })

    it('handles surrounding slashes on directories', () => {
        const plugin = laravel({
            publicDirectory: '/public/test/',
            buildDirectory: '/build/test/',
            ssrOutputDirectory: '/ssr-output/test/',
        })

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(config.base).toBe('/build/test/')
        expect(config.build.outDir).toBe('public/test/build/test')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' })

        expect(ssrConfig.build.outDir).toBe('ssr-output/test')
    })

    it('provides an @ alias by default', () => {
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({}, { command: 'build', mode: 'development' })

        expect(config.resolve.alias['@']).toBe('/resources/js')
    })

    it('respects a users existing @ alias', () => {
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({
            resolve: {
                alias: {
                    '@': '/somewhere/else'
                }
            }
        }, { command: 'build', mode: 'development' })

        expect(config.resolve.alias['@']).toBe('/somewhere/else')
    })

    it('appends an Alias object when using an alias array', () => {
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({
            resolve: {
                alias: [
                    { find: '@', replacement: '/something/else' }
                ],
            }
        }, { command: 'build', mode: 'development' })

        expect(config.resolve.alias).toEqual([
            { find: '@', replacement: '/something/else' },
            { find: '@', replacement: '/resources/js' },
        ])
    })

    it('prevents empty input', () => {
        /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
        /* @ts-ignore */
        expect(() => laravel())
            .toThrowError('Laravel plugin requires configuration.')
    })
})

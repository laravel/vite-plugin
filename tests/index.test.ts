import { UserConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import laravel from '../src'

describe('vite-plugin-laravel', () => {
    it('accepts a single input', () => {
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({}, { command: 'build', mode: 'development' }) as UserConfig

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('public/build')
        expect(config.build?.rollupOptions?.input).toBe('resources/js/app.js')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' }) as UserConfig

        expect(ssrConfig.base).toBe('/build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('storage/framework/ssr')
        expect(ssrConfig.build?.rollupOptions?.input).toBe('resources/js/app.js')
    })

    it('accepts an array of inputs', () => {
        const plugin = laravel([
            'resources/js/app.js',
            'resources/js/other.js',
        ])

        const config = plugin.config({}, { command: 'build', mode: 'development' }) as UserConfig

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('public/build')
        expect(config.build?.rollupOptions?.input).toEqual(['resources/js/app.js', 'resources/js/other.js'])

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' }) as UserConfig

        expect(ssrConfig.base).toBe('/build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('storage/framework/ssr')
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

        const config = plugin.config({}, { command: 'build', mode: 'development' }) as UserConfig

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/other-build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('other-public/other-build')
        expect(config.build?.rollupOptions?.input).toBe('resources/js/app.js')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' }) as UserConfig

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

        const config = plugin.config({}, { command: 'build', mode: 'development' }) as UserConfig

        expect(plugin.name).toBe('laravel')
        expect(config.base).toBe('/build/')
        expect(config.build?.manifest).toBe(true)
        expect(config.build?.outDir).toBe('public/build')
        expect(config.build?.rollupOptions?.input).toBe('resources/js/app.js')

        const ssrConfig = plugin.config({ build: { ssr: true } }, { command: 'build', mode: 'development' }) as UserConfig

        expect(ssrConfig.base).toBe('/build/')
        expect(ssrConfig.build?.manifest).toBe(false)
        expect(ssrConfig.build?.outDir).toBe('storage/framework/ssr')
        expect(ssrConfig.build?.rollupOptions?.input).toBe('resources/js/ssr.js')
    })

    it('prefixes the base with ASSET_URL', () => {
        process.env.ASSET_URL = 'http://example.com'
        const plugin = laravel('resources/js/app.js')

        const config = plugin.config({}, { command: 'build', mode: 'development' }) as UserConfig

        expect(config.base).toBe('http://example.com/build/')
    })
})

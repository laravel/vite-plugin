import { describe, expect, it } from 'vitest'
import laravel from '../src'
import { local, google, bunny, fontsource } from '../src/fonts/index'
import { validateFontsConfig, validateFontConfig, familyToVariable, familyToSlug, inferFormat, resolveLocalFont } from '../src/fonts/config'
import type { FontConfig } from '../src/fonts/types'
import path from 'path'

describe('fonts config', () => {
    describe('familyToVariable', () => {
        it('converts a simple family name', () => {
            expect(familyToVariable('Inter')).toBe('--font-inter')
        })

        it('converts a multi-word family name', () => {
            expect(familyToVariable('Open Sans')).toBe('--font-open-sans')
        })

        it('handles special characters', () => {
            expect(familyToVariable('Noto Sans JP')).toBe('--font-noto-sans-jp')
        })

        it('strips leading and trailing dashes', () => {
            expect(familyToVariable(' Inter ')).toBe('--font-inter')
        })
    })

    describe('familyToSlug', () => {
        it('converts a family to a slug', () => {
            expect(familyToSlug('Open Sans')).toBe('open-sans')
        })

        it('handles single-word families', () => {
            expect(familyToSlug('Inter')).toBe('inter')
        })
    })

    describe('inferFormat', () => {
        it('infers woff2 format', () => {
            expect(inferFormat('font.woff2')).toBe('woff2')
        })

        it('infers woff format', () => {
            expect(inferFormat('font.woff')).toBe('woff')
        })

        it('infers ttf format', () => {
            expect(inferFormat('font.ttf')).toBe('ttf')
        })

        it('infers otf format', () => {
            expect(inferFormat('font.otf')).toBe('otf')
        })

        it('throws for unsupported format', () => {
            expect(() => inferFormat('font.svg')).toThrowError('Unsupported font file format')
        })
    })

    describe('provider factories', () => {
        it('creates a local provider config', () => {
            const config = local('fonts/Inter.woff2')
            expect(config).toEqual({ type: 'local', src: 'fonts/Inter.woff2' })
        })

        it('creates a local provider config with array', () => {
            const config = local(['fonts/Inter.woff2', 'fonts/Inter.woff'])
            expect(config).toEqual({ type: 'local', src: ['fonts/Inter.woff2', 'fonts/Inter.woff'] })
        })

        it('creates a google provider config', () => {
            expect(google()).toEqual({ type: 'google' })
        })

        it('creates a bunny provider config', () => {
            expect(bunny()).toEqual({ type: 'bunny' })
        })

        it('creates a fontsource provider config without options', () => {
            expect(fontsource()).toEqual({ type: 'fontsource', package: undefined })
        })

        it('creates a fontsource provider config with package override', () => {
            expect(fontsource({ package: '@fontsource/inter' })).toEqual({
                type: 'fontsource',
                package: '@fontsource/inter',
            })
        })
    })

    describe('validateFontConfig', () => {
        it('rejects empty family', () => {
            expect(() => validateFontConfig({
                family: '',
                provider: local('test.woff2'),
            })).toThrowError('Font family name must be a non-empty string')
        })

        it('rejects missing provider', () => {
            expect(() => validateFontConfig({
                family: 'Inter',
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                provider: null as any,
            })).toThrowError('invalid provider configuration')
        })

        it('rejects local provider with no source', () => {
            expect(() => validateFontConfig({
                family: 'Inter',
                provider: { type: 'local', src: '' },
            })).toThrowError('must specify at least one source file')
        })

        it('rejects local provider with empty array source', () => {
            expect(() => validateFontConfig({
                family: 'Inter',
                provider: { type: 'local', src: [] },
            })).toThrowError('must specify at least one source file')
        })

        it('accepts valid config', () => {
            expect(() => validateFontConfig({
                family: 'Inter',
                provider: local('fonts/inter.woff2'),
            })).not.toThrow()
        })
    })

    describe('validateFontsConfig', () => {
        it('rejects duplicate CSS variable names', () => {
            expect(() => validateFontsConfig([
                { family: 'Inter', provider: google() },
                { family: 'Inter', provider: bunny() },
            ])).toThrowError('Duplicate CSS variable "--font-inter"')
        })

        it('allows duplicate families with explicit different variables', () => {
            expect(() => validateFontsConfig([
                { family: 'Inter', provider: google(), variable: '--font-inter-google' },
                { family: 'Inter', provider: bunny(), variable: '--font-inter-bunny' },
            ])).not.toThrow()
        })

        it('allows explicit variable and tailwind mappings', () => {
            expect(() => validateFontsConfig([
                { family: 'Inter', provider: google(), variable: '--font-body', tailwind: 'sans' },
            ])).not.toThrow()
        })
    })

    describe('resolveLocalFont', () => {
        const projectRoot = path.resolve(__dirname, '..')

        it('resolves a local font with defaults', () => {
            const config: FontConfig = {
                family: 'Test Font',
                provider: local('tests/fixtures/fonts/test-font.woff2'),
            }

            const resolved = resolveLocalFont(config, projectRoot)

            expect(resolved.family).toBe('Test Font')
            expect(resolved.variable).toBe('--font-test-font')
            expect(resolved.display).toBe('swap')
            expect(resolved.fallback).toBe(true)
            expect(resolved.provider).toBe('local')
            expect(resolved.variants).toHaveLength(1)
            expect(resolved.variants[0].weight).toBe(400)
            expect(resolved.variants[0].style).toBe('normal')
            expect(resolved.variants[0].files).toHaveLength(1)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
        })

        it('resolves multiple weights and styles', () => {
            const config: FontConfig = {
                family: 'Test Font',
                provider: local('tests/fixtures/fonts/test-font.woff2'),
                weights: [400, 700],
                styles: ['normal', 'italic'],
            }

            const resolved = resolveLocalFont(config, projectRoot)

            expect(resolved.variants).toHaveLength(4) // 2 weights * 2 styles
        })

        it('uses custom variable and tailwind', () => {
            const config: FontConfig = {
                family: 'Test Font',
                provider: local('tests/fixtures/fonts/test-font.woff2'),
                variable: '--font-body',
                tailwind: 'sans',
            }

            const resolved = resolveLocalFont(config, projectRoot)

            expect(resolved.variable).toBe('--font-body')
            expect(resolved.tailwind).toBe('sans')
        })

        it('resolves multiple source files', () => {
            const config: FontConfig = {
                family: 'Test Font',
                provider: local([
                    'tests/fixtures/fonts/test-font.woff2',
                    'tests/fixtures/fonts/test-font.ttf',
                ]),
            }

            const resolved = resolveLocalFont(config, projectRoot)

            expect(resolved.variants[0].files).toHaveLength(2)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
            expect(resolved.variants[0].files[1].format).toBe('ttf')
        })

        it('throws for missing local font file', () => {
            const config: FontConfig = {
                family: 'Missing',
                provider: local('fonts/does-not-exist.woff2'),
            }

            expect(() => resolveLocalFont(config, projectRoot))
                .toThrowError('Local font file not found')
        })
    })

    describe('plugin integration', () => {
        it('accepts fonts alongside existing plugin config', () => {
            const plugins = laravel({
                input: 'resources/js/app.ts',
                fonts: [
                    { family: 'Inter', provider: google() },
                ],
            })

            expect(plugins.find(p => p.name === 'laravel:fonts')).toBeDefined()
        })

        it('preserves existing behavior when fonts is omitted', () => {
            const plugins = laravel({
                input: 'resources/js/app.ts',
            })

            expect(plugins.find(p => p.name === 'laravel:fonts')).toBeUndefined()
        })

        it('does not include fonts plugin when fonts is empty array', () => {
            const plugins = laravel({
                input: 'resources/js/app.ts',
                fonts: [],
            })

            expect(plugins.find(p => p.name === 'laravel:fonts')).toBeUndefined()
        })

        it('includes fonts plugin alongside other plugins', () => {
            const plugins = laravel({
                input: 'resources/js/app.ts',
                fonts: [{ family: 'Inter', provider: google() }],
                refresh: true,
                assets: 'tests/__data__/*.png',
            })

            expect(plugins.find(p => p.name === 'laravel')).toBeDefined()
            expect(plugins.find(p => p.name === 'laravel:assets')).toBeDefined()
            expect(plugins.find(p => p.name === 'laravel:fonts')).toBeDefined()
        })
    })
})

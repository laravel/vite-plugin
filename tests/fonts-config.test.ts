import { describe, expect, it } from 'vitest'
import laravel from '../src'
import { local, google, bunny, fontsource } from '../src/fonts/index'
import { validateFontsConfig, validateFontDefinition, mergeFontDefinitions, familyToVariable, familyToSlug, aliasToVariable, inferFormat, resolveLocalFont, inferWeightFromFilename, inferStyleFromFilename, inferLocalVariantFromFilename, looksLikeVariableFontFilename } from '../src/fonts/config'
import type { FontDefinition } from '../src/fonts/types'
import path from 'path'
import fs from 'fs'
import os from 'os'

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

    describe('aliasToVariable', () => {
        it('prefixes alias with --font-', () => {
            expect(aliasToVariable('sans')).toBe('--font-sans')
        })

        it('handles multi-word alias', () => {
            expect(aliasToVariable('jetbrains-mono')).toBe('--font-jetbrains-mono')
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

    describe('provider-first builders', () => {
        it('google() returns a FontDefinition with family and defaults', () => {
            const def = google('Inter')
            expect(def.family).toBe('Inter')
            expect(def.provider).toBe('google')
            expect(def.alias).toBe('inter')
            expect(def.variable).toBe('--font-inter')
            expect(def.weights).toEqual([400])
            expect(def.styles).toEqual(['normal'])
            expect(def.subsets).toEqual(['latin'])
            expect(def.display).toBe('swap')
            expect(def.preload).toBe(true)
            expect(def.fallbacks).toEqual([])
            expect(def.optimizedFallbacks).toBe(true)
        })

        it('google() derives alias from family name', () => {
            const def = google('Open Sans')
            expect(def.alias).toBe('open-sans')
        })

        it('google() derives variable from alias', () => {
            const def = google('Open Sans')
            expect(def.variable).toBe('--font-open-sans')
        })

        it('google() uses custom alias when provided', () => {
            const def = google('Inter', { alias: 'sans' })
            expect(def.alias).toBe('sans')
        })

        it('google() derives variable from custom alias, not family', () => {
            const def = google('Inter', { alias: 'sans' })
            expect(def.variable).toBe('--font-sans')
        })

        it('google() accepts all options', () => {
            const def = google('Inter', {
                alias: 'sans',
                variable: '--font-body',
                weights: [400, 700],
                styles: ['normal', 'italic'],
                subsets: ['latin', 'cyrillic'],
                display: 'block',
                preload: [{ weight: 400, style: 'normal' }],
                fallbacks: ['system-ui', 'sans-serif'],
                optimizedFallbacks: false,
            })
            expect(def.alias).toBe('sans')
            expect(def.variable).toBe('--font-body')
            expect(def.weights).toEqual([400, 700])
            expect(def.styles).toEqual(['normal', 'italic'])
            expect(def.subsets).toEqual(['latin', 'cyrillic'])
            expect(def.display).toBe('block')
            expect(def.preload).toEqual([{ weight: 400, style: 'normal' }])
            expect(def.fallbacks).toEqual(['system-ui', 'sans-serif'])
            expect(def.optimizedFallbacks).toBe(false)
        })

        it('does not carry a tailwind field on the returned definition', () => {
            const def = google('Inter', { alias: 'sans' })

            expect('tailwind' in def).toBe(false)
        })

        it('ignores a legacy tailwind option passed via a loose caller without emitting it', () => {
            const loose = { alias: 'sans', tailwind: 'sans' } as unknown as Parameters<typeof google>[1]
            const def = google('Inter', loose) as Record<string, unknown>

            expect('tailwind' in def).toBe(false)
            expect(def.tailwind).toBeUndefined()
        })

        it('bunny() returns a FontDefinition with bunny provider', () => {
            const def = bunny('Space Grotesk')
            expect(def.family).toBe('Space Grotesk')
            expect(def.provider).toBe('bunny')
            expect(def.alias).toBe('space-grotesk')
            expect(def.variable).toBe('--font-space-grotesk')
        })

        it('fontsource() returns a FontDefinition with fontsource provider', () => {
            const def = fontsource('JetBrains Mono')
            expect(def.family).toBe('JetBrains Mono')
            expect(def.provider).toBe('fontsource')
            expect(def.alias).toBe('jetbrains-mono')
        })

        it('fontsource() passes package option through _fontsource', () => {
            const def = fontsource('JetBrains Mono', { package: '@fontsource/jetbrains-mono' })
            expect(def._fontsource?.package).toBe('@fontsource/jetbrains-mono')
        })

        it('local() returns a FontDefinition with explicit variants', () => {
            const def = local('Caveat Brush', {
                variants: [
                    { src: 'fonts/caveat.woff2', weight: 400 },
                ],
            })
            expect(def.family).toBe('Caveat Brush')
            expect(def.provider).toBe('local')
            expect(def.alias).toBe('caveat-brush')
            expect(def._local?.variants).toHaveLength(1)
            expect(def._local?.variants[0].src).toBe('fonts/caveat.woff2')
        })

        it('local() accepts alias and variable options', () => {
            const def = local('Caveat Brush', {
                alias: 'handwriting',
                variable: '--font-handwriting',
                variants: [{ src: 'fonts/caveat.woff2', weight: 400 }],
            })
            expect(def.alias).toBe('handwriting')
            expect(def.variable).toBe('--font-handwriting')
        })

        it('all builders default optimizedFallbacks to true', () => {
            expect(google('Inter').optimizedFallbacks).toBe(true)
            expect(bunny('Inter').optimizedFallbacks).toBe(true)
            expect(fontsource('Inter').optimizedFallbacks).toBe(true)
            expect(local('Inter', { variants: [{ src: 'x.woff2', weight: 400 }] }).optimizedFallbacks).toBe(true)
        })

        it('all builders default preload to true', () => {
            expect(google('Inter').preload).toBe(true)
            expect(bunny('Inter').preload).toBe(true)
            expect(fontsource('Inter').preload).toBe(true)
            expect(local('Inter', { variants: [{ src: 'x.woff2', weight: 400 }] }).preload).toBe(true)
        })

        it('all builders default fallbacks to empty array', () => {
            expect(google('Inter').fallbacks).toEqual([])
            expect(bunny('Inter').fallbacks).toEqual([])
            expect(fontsource('Inter').fallbacks).toEqual([])
            expect(local('Inter', { variants: [{ src: 'x.woff2', weight: 400 }] }).fallbacks).toEqual([])
        })

        it('all builders default display to swap', () => {
            expect(google('Inter').display).toBe('swap')
            expect(bunny('Inter').display).toBe('swap')
            expect(fontsource('Inter').display).toBe('swap')
            expect(local('Inter', { variants: [{ src: 'x.woff2', weight: 400 }] }).display).toBe('swap')
        })
    })

    describe('validateFontDefinition', () => {
        it('rejects empty family', () => {
            const def = google('Inter')
            def.family = ''
            expect(() => validateFontDefinition(def)).toThrowError('Font family name must be a non-empty string')
        })

        it('rejects empty alias', () => {
            const def = google('Inter')
            def.alias = ''
            expect(() => validateFontDefinition(def)).toThrowError('invalid or empty alias')
        })

        it('rejects local definition with no variants', () => {
            const def: FontDefinition = {
                family: 'Test',
                alias: 'test',
                provider: 'local',
                variable: '--font-test',
                weights: [],
                styles: [],
                subsets: [],
                display: 'swap',
                preload: true,
                fallbacks: [],
                optimizedFallbacks: true,
                _local: { variants: [] },
            }
            expect(() => validateFontDefinition(def)).toThrowError('must specify at least one variant')
        })

        it('rejects local variant with empty src', () => {
            const def: FontDefinition = {
                family: 'Test',
                alias: 'test',
                provider: 'local',
                variable: '--font-test',
                weights: [],
                styles: [],
                subsets: [],
                display: 'swap',
                preload: true,
                fallbacks: [],
                optimizedFallbacks: true,
                _local: { variants: [{ src: '', weight: 400 }] },
            }
            expect(() => validateFontDefinition(def)).toThrowError('invalid or empty src')
        })

        it('rejects empty variable name', () => {
            const def = google('Inter')
            def.variable = ''

            expect(() => validateFontDefinition(def)).toThrowError('invalid or empty variable name')
        })

        it('rejects variable name without -- prefix', () => {
            const def = google('Inter')
            def.variable = 'font-body'

            expect(() => validateFontDefinition(def)).toThrowError('must start with "--"')
        })

        it('accepts valid variable name with -- prefix', () => {
            const def = google('Inter')
            def.variable = '--font-body'

            expect(() => validateFontDefinition(def)).not.toThrow()
        })

        it('accepts valid google definition', () => {
            expect(() => validateFontDefinition(google('Inter'))).not.toThrow()
        })
    })

    describe('validateFontsConfig', () => {
        it('rejects duplicate aliases with mismatched providers', () => {
            expect(() => validateFontsConfig([
                google('Inter'),
                bunny('Inter'),
            ])).toThrowError('provider mismatch')
        })

        it('allows duplicate family names when aliases differ', () => {
            expect(() => validateFontsConfig([
                google('Inter', { alias: 'sans' }),
                google('Inter', { alias: 'body' }),
            ])).not.toThrow()
        })

        it('rejects duplicate CSS variable names', () => {
            expect(() => validateFontsConfig([
                google('Inter'),
                bunny('Roboto', { variable: '--font-inter' }),
            ])).toThrowError('Duplicate CSS variable "--font-inter"')
        })

        it('allows explicit variable mappings', () => {
            expect(() => validateFontsConfig([
                google('Inter', { variable: '--font-body' }),
            ])).not.toThrow()
        })
    })

    describe('mergeFontDefinitions', () => {
        it('merges compatible definitions with same alias', () => {
            const merged = mergeFontDefinitions([
                google('Inter', { alias: 'sans', weights: [400, 500], styles: ['normal'] }),
                google('Inter', { alias: 'sans', weights: [400], styles: ['italic'] }),
            ])

            expect(merged).toHaveLength(1)
            expect(merged[0].weights).toEqual([400, 500])
            expect(merged[0].styles).toEqual(['normal', 'italic'])
        })

        it('deduplicates weights during merge', () => {
            const merged = mergeFontDefinitions([
                google('Inter', { alias: 'sans', weights: [400, 700] }),
                google('Inter', { alias: 'sans', weights: [400, 500] }),
            ])

            expect(merged).toHaveLength(1)
            expect(merged[0].weights).toEqual([400, 700, 500])
        })

        it('merges subsets', () => {
            const merged = mergeFontDefinitions([
                google('Inter', { alias: 'sans', subsets: ['latin'] }),
                google('Inter', { alias: 'sans', subsets: ['latin', 'cyrillic'] }),
            ])

            expect(merged).toHaveLength(1)
            expect(merged[0].subsets).toEqual(['latin', 'cyrillic'])
        })

        it('merges local variants', () => {
            const merged = mergeFontDefinitions([
                local('Inter', {
                    alias: 'sans',
                    variants: [{ src: 'fonts/inter-400.woff2', weight: 400 }],
                }),
                local('Inter', {
                    alias: 'sans',
                    variants: [{ src: 'fonts/inter-700.woff2', weight: 700 }],
                }),
            ])

            expect(merged).toHaveLength(1)
            expect(merged[0]._local?.variants).toHaveLength(2)
        })

        it('rejects merge when providers differ', () => {
            expect(() => mergeFontDefinitions([
                google('Inter', { alias: 'sans' }),
                bunny('Inter', { alias: 'sans' }),
            ])).toThrowError('provider mismatch ("google" vs "bunny")')
        })

        it('rejects merge when variables differ', () => {
            expect(() => mergeFontDefinitions([
                google('Inter', { alias: 'sans', variable: '--font-sans' }),
                google('Inter', { alias: 'sans', variable: '--font-body' }),
            ])).toThrowError('variable mismatch')
        })

        it('rejects merge when display differs', () => {
            expect(() => mergeFontDefinitions([
                google('Inter', { alias: 'sans', display: 'swap' }),
                google('Inter', { alias: 'sans', display: 'block' }),
            ])).toThrowError('display mismatch')
        })

        it('rejects merge when fallbacks differ', () => {
            expect(() => mergeFontDefinitions([
                google('Inter', { alias: 'sans', fallbacks: ['system-ui'] }),
                google('Inter', { alias: 'sans', fallbacks: ['Arial'] }),
            ])).toThrowError('fallbacks mismatch')
        })

        it('rejects merge when preload differs', () => {
            expect(() => mergeFontDefinitions([
                google('Inter', { alias: 'sans', preload: true }),
                google('Inter', { alias: 'sans', preload: false }),
            ])).toThrowError('preload mismatch')
        })

        it('rejects merge when local font shapes are incompatible', () => {
            expect(() => mergeFontDefinitions([
                local('Inter', { alias: 'sans', src: 'fonts/inter' }),
                local('Inter', {
                    alias: 'sans',
                    variants: [{ src: 'fonts/Inter-Bold.woff2', weight: 700 }],
                }),
            ])).toThrowError('incompatible local font shapes')
        })

        it('passes through definitions with unique aliases unchanged', () => {
            const fonts = [
                google('Inter', { alias: 'sans' }),
                google('Roboto', { alias: 'body' }),
            ]
            const merged = mergeFontDefinitions(fonts)

            expect(merged).toHaveLength(2)
            expect(merged[0].alias).toBe('sans')
            expect(merged[1].alias).toBe('body')
        })

        it('validateFontsConfig returns merged definitions', () => {
            const merged = validateFontsConfig([
                google('Inter', { alias: 'sans', weights: [400], styles: ['normal'] }),
                google('Inter', { alias: 'sans', weights: [700], styles: ['italic'] }),
            ])

            expect(merged).toHaveLength(1)
            expect(merged[0].weights).toEqual([400, 700])
            expect(merged[0].styles).toEqual(['normal', 'italic'])
        })
    })

    describe('resolveLocalFont', () => {
        const projectRoot = path.resolve(__dirname, '..')

        it('resolves a single variant with one source file', async () => {
            const def = local('Test Font', {
                variants: [
                    { src: 'tests/fixtures/fonts/test-font.woff2', weight: 400 },
                ],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.family).toBe('Test Font')
            expect(resolved.alias).toBe('test-font')
            expect(resolved.variable).toBe('--font-test-font')
            expect(resolved.display).toBe('swap')
            expect(resolved.optimizedFallbacks).toBe(true)
            expect(resolved.fallbacks).toEqual([])
            expect(resolved.preload).toBe(true)
            expect(resolved.provider).toBe('local')
            expect(resolved.variants).toHaveLength(1)
            expect(resolved.variants[0].weight).toBe(400)
            expect(resolved.variants[0].style).toBe('normal')
            expect(resolved.variants[0].files).toHaveLength(1)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
        })

        it('resolves multiple variants with different weights', async () => {
            const def = local('Test Font', {
                variants: [
                    { src: 'tests/fixtures/fonts/test-font.woff2', weight: 400 },
                    { src: 'tests/fixtures/fonts/test-font-2.woff2', weight: 700 },
                ],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(2)
            expect(resolved.variants[0].weight).toBe(400)
            expect(resolved.variants[1].weight).toBe(700)
        })

        it('resolves a variant with multiple source formats', async () => {
            const def = local('Test Font', {
                variants: [
                    { src: ['tests/fixtures/fonts/test-font.woff2', 'tests/fixtures/fonts/test-font.ttf'], weight: 400 },
                ],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants[0].files).toHaveLength(2)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
            expect(resolved.variants[0].files[1].format).toBe('ttf')
        })

        it('normalizes explicit variant source format priority', async () => {
            const def = local('Test Font', {
                variants: [
                    { src: ['tests/fixtures/fonts/test-font.ttf', 'tests/fixtures/fonts/test-font.woff2'], weight: 400 },
                ],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants[0].files).toHaveLength(2)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
            expect(resolved.variants[0].files[1].format).toBe('ttf')
        })

        it('defaults variant style to normal when omitted', async () => {
            const def = local('Test Font', {
                variants: [{ src: 'tests/fixtures/fonts/test-font.woff2', weight: 400 }],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants[0].style).toBe('normal')
        })

        it('uses explicit style from variant definition', async () => {
            const def = local('Test Font', {
                variants: [{ src: 'tests/fixtures/fonts/test-font.woff2', weight: 400, style: 'italic' }],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants[0].style).toBe('italic')
        })

        it('does NOT create cartesian product -- variant count matches input', async () => {
            const def = local('Test Font', {
                variants: [
                    { src: 'tests/fixtures/fonts/test-font.woff2', weight: 400 },
                    { src: 'tests/fixtures/fonts/test-font.woff2', weight: 400, style: 'italic' },
                    { src: 'tests/fixtures/fonts/test-font-2.woff2', weight: 700 },
                ],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(3)
        })

        it('preserves alias and variable from FontDefinition', async () => {
            const def = local('Test Font', {
                alias: 'body',
                variable: '--font-body',
                variants: [{ src: 'tests/fixtures/fonts/test-font.woff2', weight: 400 }],
            })

            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.alias).toBe('body')
            expect(resolved.variable).toBe('--font-body')
            expect('tailwind' in resolved).toBe(false)
        })

        it('throws for missing local font file', async () => {
            const def = local('Missing', {
                variants: [{ src: 'fonts/does-not-exist.woff2', weight: 400 }],
            })

            await expect(resolveLocalFont(def, projectRoot))
                .rejects.toThrowError('Local font file not found')
        })
    })

    describe('local() API shape', () => {
        it('accepts shorthand src', () => {
            const def = local('Inter', { src: 'fonts/inter' })
            expect(def.provider).toBe('local')
            expect(def._local).toEqual({ src: 'fonts/inter' })
        })

        it('accepts explicit variants', () => {
            const def = local('Inter', {
                variants: [{ src: 'fonts/Inter-Regular.woff2', weight: 400 }],
            })
            expect(def._local).toEqual({ variants: [{ src: 'fonts/Inter-Regular.woff2', weight: 400 }] })
        })

        it('allows variants with omitted weight', () => {
            const def = local('Inter', {
                variants: [{ src: 'fonts/Inter-Regular.woff2' }],
            })
            expect(def._local).toEqual({ variants: [{ src: 'fonts/Inter-Regular.woff2' }] })
        })

        it('rejects when neither src nor variants is provided via validation', () => {
            const def: FontDefinition = {
                family: 'Test',
                alias: 'test',
                provider: 'local',
                variable: '--font-test',
                weights: [],
                styles: [],
                subsets: [],
                display: 'swap',
                preload: true,
                fallbacks: [],
                optimizedFallbacks: true,
                _local: undefined,
            }
            expect(() => validateFontDefinition(def)).toThrowError('must specify either "src" or "variants"')
        })

        it('rejects empty src string via validation', () => {
            const def: FontDefinition = {
                family: 'Test',
                alias: 'test',
                provider: 'local',
                variable: '--font-test',
                weights: [],
                styles: [],
                subsets: [],
                display: 'swap',
                preload: true,
                fallbacks: [],
                optimizedFallbacks: true,
                _local: { src: '  ' },
            }
            expect(() => validateFontDefinition(def)).toThrowError('invalid or empty "src"')
        })
    })

    describe('inferWeightFromFilename', () => {
        it('infers Regular as 400', () => {
            expect(inferWeightFromFilename('Inter-Regular.woff2')).toBe(400)
        })

        it('infers Bold as 700', () => {
            expect(inferWeightFromFilename('Inter-Bold.woff2')).toBe(700)
        })

        it('infers Light as 300', () => {
            expect(inferWeightFromFilename('Inter-Light.woff2')).toBe(300)
        })

        it('infers Thin as 100', () => {
            expect(inferWeightFromFilename('Inter-Thin.woff2')).toBe(100)
        })

        it('infers ExtraLight as 200', () => {
            expect(inferWeightFromFilename('Inter-ExtraLight.woff2')).toBe(200)
        })

        it('infers UltraLight as 200', () => {
            expect(inferWeightFromFilename('Inter-UltraLight.woff2')).toBe(200)
        })

        it('infers Medium as 500', () => {
            expect(inferWeightFromFilename('Inter-Medium.woff2')).toBe(500)
        })

        it('infers SemiBold as 600', () => {
            expect(inferWeightFromFilename('Inter-SemiBold.woff2')).toBe(600)
        })

        it('infers DemiBold as 600', () => {
            expect(inferWeightFromFilename('Inter-DemiBold.woff2')).toBe(600)
        })

        it('infers ExtraBold as 800', () => {
            expect(inferWeightFromFilename('Inter-ExtraBold.woff2')).toBe(800)
        })

        it('infers UltraBold as 800', () => {
            expect(inferWeightFromFilename('Inter-UltraBold.woff2')).toBe(800)
        })

        it('infers Black as 900', () => {
            expect(inferWeightFromFilename('Inter-Black.woff2')).toBe(900)
        })

        it('infers Heavy as 900', () => {
            expect(inferWeightFromFilename('Inter-Heavy.woff2')).toBe(900)
        })

        it('infers Hairline as 100', () => {
            expect(inferWeightFromFilename('Inter-Hairline.woff2')).toBe(100)
        })

        it('infers numeric weight 500', () => {
            expect(inferWeightFromFilename('Inter-500.woff2')).toBe(500)
        })

        it('infers numeric weight 100', () => {
            expect(inferWeightFromFilename('Inter-100.woff2')).toBe(100)
        })

        it('defaults to 400 when no weight token', () => {
            expect(inferWeightFromFilename('Inter.woff2')).toBe(400)
        })

        it('extracts weight from SemiBoldItalic combined token', () => {
            expect(inferWeightFromFilename('Inter-SemiBoldItalic.woff2')).toBe(600)
        })

        it('extracts weight from LightItalic combined token', () => {
            expect(inferWeightFromFilename('Inter-LightItalic.woff2')).toBe(300)
        })

        it('uses last match — MyBoldFont-Regular.woff2 resolves to Regular', () => {
            expect(inferWeightFromFilename('MyBoldFont-Regular.woff2')).toBe(400)
        })

        it('handles underscore separators', () => {
            expect(inferWeightFromFilename('Inter_Bold.woff2')).toBe(700)
        })

        it('handles camelCase boundaries', () => {
            expect(inferWeightFromFilename('InterBold.woff2')).toBe(700)
        })

        it('is case-insensitive', () => {
            expect(inferWeightFromFilename('Inter-bold.woff2')).toBe(700)
            expect(inferWeightFromFilename('Inter-BOLD.woff2')).toBe(700)
        })
    })

    describe('inferStyleFromFilename', () => {
        it('infers Italic as italic', () => {
            expect(inferStyleFromFilename('Inter-Italic.woff2')).toBe('italic')
        })

        it('infers It as italic', () => {
            expect(inferStyleFromFilename('Inter-It.woff2')).toBe('italic')
        })

        it('infers Oblique as oblique', () => {
            expect(inferStyleFromFilename('Inter-Oblique.woff2')).toBe('oblique')
        })

        it('defaults to normal when no style token', () => {
            expect(inferStyleFromFilename('Inter-Regular.woff2')).toBe('normal')
        })

        it('infers italic from SemiBoldItalic combined token', () => {
            expect(inferStyleFromFilename('Inter-SemiBoldItalic.woff2')).toBe('italic')
        })

        it('infers italic from LightItalic combined token', () => {
            expect(inferStyleFromFilename('Inter-LightItalic.woff2')).toBe('italic')
        })

        it('is case-insensitive', () => {
            expect(inferStyleFromFilename('Inter-italic.woff2')).toBe('italic')
        })

        it('does not falsely detect italic from filenames ending in "it"', () => {
            expect(inferStyleFromFilename('Split.woff2')).toBe('normal')
            expect(inferStyleFromFilename('Outfit.woff2')).toBe('normal')
            expect(inferStyleFromFilename('Transit.woff2')).toBe('normal')
        })

        it('still detects italic from weight-prefixed "it" suffix', () => {
            expect(inferStyleFromFilename('Inter-BoldIt.woff2')).toBe('italic')
            expect(inferStyleFromFilename('Inter-LightIt.woff2')).toBe('italic')
            expect(inferStyleFromFilename('Inter-MediumIt.woff2')).toBe('italic')
        })
    })

    describe('inferLocalVariantFromFilename', () => {
        it('returns both weight and style', () => {
            expect(inferLocalVariantFromFilename('Inter-SemiBoldItalic.woff2')).toEqual({
                weight: 600,
                style: 'italic',
            })
        })

        it('defaults to 400 normal for plain filename', () => {
            expect(inferLocalVariantFromFilename('Inter.woff2')).toEqual({
                weight: 400,
                style: 'normal',
            })
        })
    })

    describe('looksLikeVariableFontFilename', () => {
        it('detects [wght] axis notation', () => {
            expect(looksLikeVariableFontFilename('Inter[wght].woff2')).toBe(true)
        })

        it('detects [wght,ital] axis notation', () => {
            expect(looksLikeVariableFontFilename('Inter[wght,ital].woff2')).toBe(true)
        })

        it('returns false for normal filenames', () => {
            expect(looksLikeVariableFontFilename('Inter-Regular.woff2')).toBe(false)
        })
    })

    describe('resolveLocalFont with inferred weight', () => {
        const projectRoot = path.resolve(__dirname, '..')

        it('infers weight from filename when omitted in explicit variant', async () => {
            const def = local('Test Font', {
                variants: [{ src: 'tests/fixtures/fonts/test-font.woff2' }],
            })

            const resolved = await resolveLocalFont(def, projectRoot)
            expect(resolved.variants[0].weight).toBe(400)
            expect(resolved.variants[0].style).toBe('normal')
        })

        it('explicit weight overrides inferred value', async () => {
            const def = local('Test Font', {
                variants: [{ src: 'tests/fixtures/fonts/test-font.woff2', weight: 700 }],
            })

            const resolved = await resolveLocalFont(def, projectRoot)
            expect(resolved.variants[0].weight).toBe(700)
        })

        it('explicit style overrides inferred value', async () => {
            const def = local('Test Font', {
                variants: [{ src: 'tests/fixtures/fonts/test-font.woff2', style: 'italic' }],
            })

            const resolved = await resolveLocalFont(def, projectRoot)
            expect(resolved.variants[0].style).toBe('italic')
        })
    })

    describe('resolveLocalFont shorthand', () => {
        const projectRoot = path.resolve(__dirname, '..')
        const fixtureFont = path.resolve(__dirname, 'fixtures/fonts/test-font.woff2')
        const fixtureTtf = path.resolve(__dirname, 'fixtures/fonts/test-font.ttf')
        let tmpDir: string

        function createTmpDir(): string {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-font-test-'))
            return dir
        }

        function copyFixture(dest: string, source: string = fixtureFont): void {
            const dir = path.dirname(dest)
            if (! fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            fs.copyFileSync(source, dest)
        }

        function cleanup(dir: string): void {
            fs.rmSync(dir, { recursive: true, force: true })
        }

        it('single-file shorthand creates one resolved variant', async () => {
            tmpDir = createTmpDir()
            const fontFile = path.join(tmpDir, 'Inter-Bold.woff2')
            copyFixture(fontFile)

            const def = local('Inter', { src: fontFile })
            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(1)
            expect(resolved.variants[0].weight).toBe(700)
            expect(resolved.variants[0].style).toBe('normal')
            expect(resolved.variants[0].files).toHaveLength(1)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
            cleanup(tmpDir)
        })

        it('directory shorthand discovers files recursively', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'inter')
            copyFixture(path.join(fontsDir, 'Inter-Regular.woff2'))
            copyFixture(path.join(fontsDir, 'Inter-Bold.woff2'))
            copyFixture(path.join(fontsDir, 'sub', 'Inter-Light.woff2'))

            const def = local('Inter', { src: fontsDir })
            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(3)
            expect(resolved.variants[0].weight).toBe(300)
            expect(resolved.variants[1].weight).toBe(400)
            expect(resolved.variants[2].weight).toBe(700)
            cleanup(tmpDir)
        })

        it('glob shorthand filters results', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'inter')
            copyFixture(path.join(fontsDir, 'Inter-Regular.woff2'))
            copyFixture(path.join(fontsDir, 'Inter-Bold.ttf'), fixtureTtf)

            const def = local('Inter', { src: path.join(fontsDir, '*.woff2') })
            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(1)
            expect(resolved.variants[0].weight).toBe(400)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
            cleanup(tmpDir)
        })

        it('groups same weight/style files into one multi-format variant', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'inter')
            copyFixture(path.join(fontsDir, 'Inter-Regular.woff2'))
            copyFixture(path.join(fontsDir, 'Inter-Regular.ttf'), fixtureTtf)

            const def = local('Inter', { src: fontsDir })
            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(1)
            expect(resolved.variants[0].weight).toBe(400)
            expect(resolved.variants[0].files).toHaveLength(2)
            expect(resolved.variants[0].files[0].format).toBe('woff2')
            expect(resolved.variants[0].files[1].format).toBe('ttf')
            cleanup(tmpDir)
        })

        it('output is sorted deterministically by weight then style', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'inter')
            copyFixture(path.join(fontsDir, 'Inter-BoldItalic.woff2'))
            copyFixture(path.join(fontsDir, 'Inter-Bold.woff2'))
            copyFixture(path.join(fontsDir, 'Inter-Regular.woff2'))
            copyFixture(path.join(fontsDir, 'Inter-LightItalic.woff2'))

            const def = local('Inter', { src: fontsDir })
            const resolved = await resolveLocalFont(def, projectRoot)

            expect(resolved.variants).toHaveLength(4)
            expect(resolved.variants[0]).toMatchObject({ weight: 300, style: 'italic' })
            expect(resolved.variants[1]).toMatchObject({ weight: 400, style: 'normal' })
            expect(resolved.variants[2]).toMatchObject({ weight: 700, style: 'italic' })
            expect(resolved.variants[3]).toMatchObject({ weight: 700, style: 'normal' })
            cleanup(tmpDir)
        })

        it('throws for shorthand path that does not exist', async () => {
            const def = local('Inter', { src: '/does/not/exist/fonts' })
            await expect(resolveLocalFont(def, projectRoot))
                .rejects.toThrowError('does not exist')
        })

        it('throws for glob with zero matches', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'empty')
            fs.mkdirSync(fontsDir, { recursive: true })

            const def = local('Inter', { src: path.join(fontsDir, '*.woff2') })
            await expect(resolveLocalFont(def, projectRoot))
                .rejects.toThrowError('matched no supported font files')
            cleanup(tmpDir)
        })

        it('throws for directory with no supported font files', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'nope')
            fs.mkdirSync(fontsDir, { recursive: true })
            fs.writeFileSync(path.join(fontsDir, 'readme.txt'), 'not a font')

            const def = local('Inter', { src: fontsDir })
            await expect(resolveLocalFont(def, projectRoot))
                .rejects.toThrowError('contains no supported font files')
            cleanup(tmpDir)
        })

        it('throws for variable font filename in shorthand', async () => {
            tmpDir = createTmpDir()
            const fontsDir = path.join(tmpDir, 'inter')
            copyFixture(path.join(fontsDir, 'Inter[wght].woff2'))

            const def = local('Inter', { src: fontsDir })
            await expect(resolveLocalFont(def, projectRoot))
                .rejects.toThrowError('Variable fonts require explicit "variants"')
            cleanup(tmpDir)
        })
    })

    describe('plugin integration', () => {
        it('accepts fonts alongside existing plugin config', () => {
            const plugins = laravel({
                input: 'resources/js/app.ts',
                fonts: [
                    google('Inter'),
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
                fonts: [google('Inter')],
                refresh: true,
                assets: 'tests/__data__/*.png',
            })

            expect(plugins.find(p => p.name === 'laravel')).toBeDefined()
            expect(plugins.find(p => p.name === 'laravel:assets')).toBeDefined()
            expect(plugins.find(p => p.name === 'laravel:fonts')).toBeDefined()
        })
    })
})

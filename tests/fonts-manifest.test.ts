import { describe, expect, it } from 'vitest'
import { buildManifest, buildDevManifest } from '../src/fonts/manifest'
import type { ResolvedFontFamily } from '../src/fonts/types'

function makeFamily(overrides?: Partial<ResolvedFontFamily>): ResolvedFontFamily {
    return {
        family: 'Inter',
        alias: 'inter',
        variable: '--font-inter',
        display: 'swap',
        optimizedFallbacks: true,
        fallbacks: [],
        preload: true,
        provider: 'local',
        variants: [{
            weight: 400,
            style: 'normal',
            files: [{
                source: '/fonts/inter-400.woff2',
                format: 'woff2',
            }],
        }],
        ...overrides,
    }
}

describe('fonts manifest', () => {
    describe('buildManifest', () => {
        it('builds a valid production manifest with version 1', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])
            const familyStyles = { 'inter': '@font-face { font-family: "Inter"; }' }
            const variables = { 'inter': '--font-inter: "Inter";' }

            const manifest = buildManifest(families, 'assets/fonts-abc123.css', filePathMap, familyStyles, variables)

            expect(manifest.version).toBe(1)
            expect(manifest.style.file).toBe('assets/fonts-abc123.css')
            expect(manifest.style.inline).toBeUndefined()
            expect(manifest.style.familyStyles).toEqual(familyStyles)
            expect(manifest.style.variables).toEqual(variables)
        })

        it('keys families by alias', () => {
            const families = [makeFamily({ alias: 'sans' })]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, {})

            expect(manifest.families['sans']).toBeDefined()
            expect(manifest.families['Inter']).toBeUndefined()
        })

        it('includes actual font-family name in family entry', () => {
            const families = [makeFamily({ alias: 'sans' })]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, {})

            expect(manifest.families['sans'].family).toBe('Inter')
        })

        it('includes preloads for woff2 files', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, {})

            expect(manifest.preloads).toHaveLength(1)
            expect(manifest.preloads[0]).toEqual({
                alias: 'inter',
                family: 'Inter',
                weight: 400,
                style: 'normal',
                file: 'assets/inter-400-abc123.woff2',
                as: 'font',
                type: 'font/woff2',
                crossorigin: 'anonymous',
            })
        })

        it('skips preloads for non-woff2 files', () => {
            const families = [makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [{ source: '/fonts/inter.ttf', format: 'ttf' }],
                }],
            })]

            const manifest = buildManifest(families, 'assets/fonts.css', new Map([
                ['/fonts/inter.ttf', 'assets/inter.ttf'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(0)
        })

        it('builds family entries with variants', () => {
            const families = [makeFamily({
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                ],
            })]

            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, {})
            const interFamily = manifest.families['inter']

            expect(interFamily.family).toBe('Inter')
            expect(interFamily.variable).toBe('--font-inter')
            expect('tailwind' in interFamily).toBe(false)
            expect(interFamily.fallbackFamily).toBe('Inter fallback')
            expect(interFamily.variants['400:normal']).toBeDefined()
            expect(interFamily.variants['700:normal']).toBeDefined()
            expect(interFamily.variants['400:normal'].files[0].file).toBe('assets/inter-400.woff2')
        })

        it('does not emit a tailwind field on manifest family entries even if the resolved family smuggles one', () => {
            const smuggled = makeFamily() as ResolvedFontFamily & Record<string, unknown>
            smuggled.tailwind = 'sans'

            const manifest = buildManifest([smuggled], 'assets/fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect('tailwind' in manifest.families['inter']).toBe(false)
        })

        it('merges files for variants sharing the same weight and style', () => {
            const families = [makeFamily({
                variants: [
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' }],
                    },
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-cyrillic.woff2', format: 'woff2', unicodeRange: 'U+0400-045F' }],
                    },
                ],
            })]

            const filePathMap = new Map([
                ['/fonts/inter-latin.woff2', 'assets/inter-latin.woff2'],
                ['/fonts/inter-cyrillic.woff2', 'assets/inter-cyrillic.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, {})

            const variant = manifest.families['inter'].variants['400:normal']
            expect(variant.files).toHaveLength(2)
            expect(variant.files[0].file).toBe('assets/inter-latin.woff2')
            expect(variant.files[0].unicodeRange).toBe('U+0000-00FF')
            expect(variant.files[1].file).toBe('assets/inter-cyrillic.woff2')
            expect(variant.files[1].unicodeRange).toBe('U+0400-045F')
        })

        it('preserves unicode-range in manifest variant files', () => {
            const families = [makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [
                        { source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' },
                    ],
                }],
            })]

            const manifest = buildManifest(families, 'assets/fonts.css', new Map([
                ['/fonts/inter-latin.woff2', 'assets/inter-latin.woff2'],
            ]), {}, {})

            expect(manifest.families['inter'].variants['400:normal'].files[0].unicodeRange).toBe('U+0000-00FF')
        })

        it('handles multiple families', () => {
            const families = [
                makeFamily(),
                makeFamily({
                    family: 'Roboto',
                    alias: 'roboto',
                    variable: '--font-roboto',
                    variants: [{
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/roboto-400.woff2', format: 'woff2' }],
                    }],
                }),
            ]

            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/roboto-400.woff2', 'assets/roboto-400.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, {})

            expect(Object.keys(manifest.families)).toEqual(['inter', 'roboto'])
            expect(manifest.preloads).toHaveLength(2)
        })

        it('omits fallbackFamily when optimizedFallbacks is false', () => {
            const families = [makeFamily({ optimizedFallbacks: false })]

            const manifest = buildManifest(families, 'assets/fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect(manifest.families['inter'].fallbackFamily).toBeUndefined()
        })

        it('includes fallbacks array in manifest family entry', () => {
            const families = [makeFamily({ fallbacks: ['system-ui', 'sans-serif'] })]

            const manifest = buildManifest(families, 'assets/fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect(manifest.families['inter'].fallbacks).toEqual(['system-ui', 'sans-serif'])
        })

        it('omits fallbacks from manifest when array is empty', () => {
            const families = [makeFamily({ fallbacks: [] })]

            const manifest = buildManifest(families, 'assets/fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect(manifest.families['inter'].fallbacks).toBeUndefined()
        })

        it('familyStyles include font classes', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])
            const familyStyles = {
                'inter': '@font-face { font-family: "Inter"; }\n\n.font-inter {\n  font-family: var(--font-inter);\n}',
            }
            const variables = { 'inter': '--font-inter: "Inter";' }

            const manifest = buildManifest(families, 'assets/fonts-abc123.css', filePathMap, familyStyles, variables)

            expect(manifest.style.familyStyles['inter']).toContain('.font-inter')
        })
    })

    describe('buildDevManifest', () => {
        it('builds a valid dev manifest with inline CSS', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const familyStyles = { 'inter': '@font-face { font-family: "Inter"; }' }
            const variables = { 'inter': '--font-inter: "Inter";' }

            const manifest = buildDevManifest(families, '@font-face { ... }', urlMap, familyStyles, variables)

            expect(manifest.version).toBe(1)
            expect(manifest.style.inline).toBe('@font-face { ... }')
            expect(manifest.style.file).toBeUndefined()
            expect(manifest.style.familyStyles).toEqual(familyStyles)
            expect(manifest.style.variables).toEqual(variables)
        })

        it('uses URLs instead of file paths in preloads', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const manifest = buildDevManifest(families, 'css', urlMap, {}, {})

            expect(manifest.preloads[0].url).toBe('http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2')
            expect(manifest.preloads[0].file).toBeUndefined()
        })

        it('preloads include alias and family', () => {
            const families = [makeFamily({ alias: 'sans' })]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const manifest = buildDevManifest(families, 'css', urlMap, {}, {})

            expect(manifest.preloads[0].alias).toBe('sans')
            expect(manifest.preloads[0].family).toBe('Inter')
        })

        it('merges files for variants sharing the same weight and style', () => {
            const families = [makeFamily({
                variants: [
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' }],
                    },
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-cyrillic.woff2', format: 'woff2', unicodeRange: 'U+0400-045F' }],
                    },
                ],
            })]

            const urlMap = new Map([
                ['/fonts/inter-latin.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/latin.woff2'],
                ['/fonts/inter-cyrillic.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/cyrillic.woff2'],
            ])

            const manifest = buildDevManifest(families, 'css', urlMap, {}, {})

            const variant = manifest.families['inter'].variants['400:normal']
            expect(variant.files).toHaveLength(2)
            expect(variant.files[0].url).toBe('http://localhost:5173/__laravel_vite_plugin__/fonts/latin.woff2')
            expect(variant.files[0].unicodeRange).toBe('U+0000-00FF')
            expect(variant.files[1].url).toBe('http://localhost:5173/__laravel_vite_plugin__/fonts/cyrillic.woff2')
            expect(variant.files[1].unicodeRange).toBe('U+0400-045F')
        })

        it('uses URLs in variant files', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const manifest = buildDevManifest(families, 'css', urlMap, {}, {})

            expect(manifest.families['inter'].variants['400:normal'].files[0].url)
                .toBe('http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2')
            expect(manifest.families['inter'].variants['400:normal'].files[0].file).toBeUndefined()
        })

        it('familyStyles in dev manifest include font classes', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])
            const familyStyles = {
                'inter': '@font-face { font-family: "Inter"; }\n\n.font-inter {\n  font-family: var(--font-inter);\n}',
            }
            const variables = { 'inter': '--font-inter: "Inter";' }

            const manifest = buildDevManifest(families, '@font-face { ... }', urlMap, familyStyles, variables)

            expect(manifest.style.familyStyles['inter']).toContain('.font-inter')
        })
    })

    describe('preload controls', () => {
        it('preload: true includes all woff2 variants in preloads', () => {
            const families = [makeFamily({
                preload: true,
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(2)
        })

        it('preload: false produces empty preloads array', () => {
            const families = [makeFamily({ preload: false })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(0)
        })

        it('preload: [{weight, style}] only includes matching variant', () => {
            const families = [makeFamily({
                preload: [{ weight: 400, style: 'normal' }],
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(1)
            expect(manifest.preloads[0].weight).toBe(400)
        })

        it('deduplicates preloads by final file path', () => {
            const families = [makeFamily({
                preload: true,
                variants: [
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' }],
                    },
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0100-024F' }],
                    },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-latin.woff2', 'assets/inter-latin.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(1)
        })

        it('deduplicates dev preloads by URL', () => {
            const families = [makeFamily({
                preload: true,
                variants: [
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' }],
                    },
                    {
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0100-024F' }],
                    },
                ],
            })]

            const manifest = buildDevManifest(families, 'css', new Map([
                ['/fonts/inter-latin.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(1)
        })

        it('preload selector that matches no variants produces empty preloads', () => {
            const families = [makeFamily({
                preload: [{ weight: 300, style: 'italic' }],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(0)
        })

        it('preload selector with omitted style matches the normal variant by default', () => {
            const families = [makeFamily({
                preload: [{ weight: 400 }],
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 400, style: 'italic', files: [{ source: '/fonts/inter-400i.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-400i.woff2', 'assets/inter-400i.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(1)
            expect(manifest.preloads[0].weight).toBe(400)
            expect(manifest.preloads[0].style).toBe('normal')
        })

        it('preload selector with omitted style does not match italic-only families', () => {
            const families = [makeFamily({
                preload: [{ weight: 400 }],
                variants: [
                    { weight: 400, style: 'italic', files: [{ source: '/fonts/inter-400i.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400i.woff2', 'assets/inter-400i.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(0)
        })

        it('preload selector with omitted style still rejects mismatched weights', () => {
            const families = [makeFamily({
                preload: [{ weight: 700 }],
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(0)
        })

        it('preload selector with explicit style keeps original behavior', () => {
            const families = [makeFamily({
                preload: [{ weight: 400, style: 'italic' }],
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 400, style: 'italic', files: [{ source: '/fonts/inter-400i.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-400i.woff2', 'assets/inter-400i.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(1)
            expect(manifest.preloads[0].style).toBe('italic')
        })

        it('emits preloads in the same order the variants appear in the resolved family', () => {
            const families = [makeFamily({
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 400, style: 'italic', files: [{ source: '/fonts/inter-400i.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-400i.woff2', 'assets/inter-400i.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
            ]), {}, {})

            expect(manifest.preloads.map(p => `${p.weight}:${p.style}`)).toEqual([
                '400:normal',
                '400:italic',
                '700:normal',
            ])
        })

        it('keeps mixed ranged/non-ranged files emitting the same set of preload entries', () => {
            const families = [makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [
                        { source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' },
                        { source: '/fonts/inter-cyrillic.woff2', format: 'woff2', unicodeRange: 'U+0400-045F' },
                        { source: '/fonts/inter-full.woff2', format: 'woff2' },
                    ],
                }],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-latin.woff2', 'assets/inter-latin.woff2'],
                ['/fonts/inter-cyrillic.woff2', 'assets/inter-cyrillic.woff2'],
                ['/fonts/inter-full.woff2', 'assets/inter-full.woff2'],
            ]), {}, {})

            expect(manifest.preloads.map(p => p.file)).toEqual([
                'assets/inter-latin.woff2',
                'assets/inter-cyrillic.woff2',
                'assets/inter-full.woff2',
            ])
        })

        it('preload selector with multiple entries includes all matches', () => {
            const families = [makeFamily({
                preload: [
                    { weight: 400, style: 'normal' },
                    { weight: 700, style: 'normal' },
                ],
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                    { weight: 400, style: 'italic', files: [{ source: '/fonts/inter-400i.woff2', format: 'woff2' }] },
                ],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
                ['/fonts/inter-400i.woff2', 'assets/inter-400i.woff2'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(2)
            expect(manifest.preloads.map(p => p.weight)).toEqual([400, 700])
        })

        it('structured variables: two aliases produce an object keyed by alias', () => {
            const families = [
                makeFamily({ alias: 'sans', variable: '--font-sans' }),
                makeFamily({
                    family: 'JetBrains Mono',
                    alias: 'mono',
                    variable: '--font-mono',
                    fallbacks: ['monospace'],
                    optimizedFallbacks: false,
                    variants: [{
                        weight: 400,
                        style: 'normal',
                        files: [{ source: '/fonts/jbm-400.woff2', format: 'woff2' }],
                    }],
                }),
            ]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/jbm-400.woff2', 'assets/jbm-400.woff2'],
            ])
            const variables = {
                'sans': '--font-sans: "Inter", "Inter fallback";',
                'mono': '--font-mono: "JetBrains Mono", monospace;',
            }

            const manifest = buildManifest(families, 'fonts.css', filePathMap, {}, variables)

            expect(typeof manifest.style.variables).toBe('object')
            expect(manifest.style.variables).toEqual(variables)
            expect(manifest.style.variables).not.toContain(':root')
        })

        it('structured variables: empty aliases set produces an empty object, never a string or null', () => {
            const families = [makeFamily()]
            const manifest = buildManifest(families, 'fonts.css', new Map(), {}, {})

            expect(manifest.style.variables).toEqual({})
            expect(typeof manifest.style.variables).toBe('object')
            expect(manifest.style.variables).not.toBeNull()
        })

        it('non-woff2 files are never preloaded even when preload is true', () => {
            const families = [makeFamily({
                preload: true,
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [{ source: '/fonts/inter.ttf', format: 'ttf' }],
                }],
            })]

            const manifest = buildManifest(families, 'fonts.css', new Map([
                ['/fonts/inter.ttf', 'assets/inter.ttf'],
            ]), {}, {})

            expect(manifest.preloads).toHaveLength(0)
        })
    })
})

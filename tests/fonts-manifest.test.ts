import { describe, expect, it } from 'vitest'
import { buildManifest, buildDevManifest } from '../src/fonts/manifest'
import type { ResolvedFontFamily } from '../src/fonts/types'

function makeFamily(overrides?: Partial<ResolvedFontFamily>): ResolvedFontFamily {
    return {
        family: 'Inter',
        variable: '--font-inter',
        display: 'swap',
        fallback: true,
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
        it('builds a valid production manifest', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])
            const familyStyles = { 'Inter': '@font-face { font-family: "Inter"; }' }
            const variables = ':root { --font-inter: "Inter"; }'

            const manifest = buildManifest(families, 'assets/fonts-abc123.css', filePathMap, familyStyles, variables)

            expect(manifest.version).toBe(1)
            expect(manifest.style.file).toBe('assets/fonts-abc123.css')
            expect(manifest.style.inline).toBeUndefined()
            expect(manifest.style.familyStyles).toEqual(familyStyles)
            expect(manifest.style.variables).toBe(variables)
        })

        it('includes preloads for woff2 files', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, '')

            expect(manifest.preloads).toHaveLength(1)
            expect(manifest.preloads[0]).toEqual({
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
            ]), {}, '')

            expect(manifest.preloads).toHaveLength(0)
        })

        it('builds family entries with variants', () => {
            const families = [makeFamily({
                tailwind: 'sans',
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                ],
            })]

            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
            ])

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, '')
            const interFamily = manifest.families['Inter']

            expect(interFamily.variable).toBe('--font-inter')
            expect(interFamily.tailwind).toBe('sans')
            expect(interFamily.fallbackFamily).toBe('Inter fallback')
            expect(interFamily.variants['400:normal']).toBeDefined()
            expect(interFamily.variants['700:normal']).toBeDefined()
            expect(interFamily.variants['400:normal'].files[0].file).toBe('assets/inter-400.woff2')
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
            ]), {}, '')

            expect(manifest.families['Inter'].variants['400:normal'].files[0].unicodeRange).toBe('U+0000-00FF')
        })

        it('handles multiple families', () => {
            const families = [
                makeFamily(),
                makeFamily({
                    family: 'Roboto',
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

            const manifest = buildManifest(families, 'assets/fonts.css', filePathMap, {}, '')

            expect(Object.keys(manifest.families)).toEqual(['Inter', 'Roboto'])
            expect(manifest.preloads).toHaveLength(2)
        })

        it('omits fallbackFamily when fallback is false', () => {
            const families = [makeFamily({ fallback: false })]

            const manifest = buildManifest(families, 'assets/fonts.css', new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ]), {}, '')

            expect(manifest.families['Inter'].fallbackFamily).toBeUndefined()
        })
    })

    describe('buildDevManifest', () => {
        it('builds a valid dev manifest with inline CSS', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const familyStyles = { 'Inter': '@font-face { font-family: "Inter"; }' }
            const variables = ':root { --font-inter: "Inter"; }'

            const manifest = buildDevManifest(families, '@font-face { ... }', urlMap, familyStyles, variables)

            expect(manifest.version).toBe(1)
            expect(manifest.style.inline).toBe('@font-face { ... }')
            expect(manifest.style.file).toBeUndefined()
            expect(manifest.style.familyStyles).toEqual(familyStyles)
            expect(manifest.style.variables).toBe(variables)
        })

        it('uses URLs instead of file paths in preloads', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const manifest = buildDevManifest(families, 'css', urlMap, {}, '')

            expect(manifest.preloads[0].url).toBe('http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2')
            expect(manifest.preloads[0].file).toBeUndefined()
        })

        it('uses URLs in variant files', () => {
            const families = [makeFamily()]
            const urlMap = new Map([
                ['/fonts/inter-400.woff2', 'http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2'],
            ])

            const manifest = buildDevManifest(families, 'css', urlMap, {}, '')

            expect(manifest.families['Inter'].variants['400:normal'].files[0].url)
                .toBe('http://localhost:5173/__laravel_vite_plugin__/fonts/abc123.woff2')
            expect(manifest.families['Inter'].variants['400:normal'].files[0].file).toBeUndefined()
        })
    })
})

import { describe, expect, it } from 'vitest'
import { generateFontFace, generateFallbackFontFace, generateCssVariables, generateFontCss, generateFontClasses, generateFontClassForFamily, generateFamilyStyles } from '../src/fonts/css'
import type { FallbackMetrics } from '../src/fonts/css'
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

describe('fonts css generation', () => {
    describe('generateFontFace', () => {
        it('generates a basic @font-face rule', () => {
            const family = makeFamily()
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400-abc123.woff2'],
            ])

            const css = generateFontFace(family, filePathMap)

            expect(css).toContain('@font-face {')
            expect(css).toContain('font-family: "Inter"')
            expect(css).toContain('font-style: normal')
            expect(css).toContain('font-weight: 400')
            expect(css).toContain('font-display: swap')
            expect(css).toContain('url("assets/inter-400-abc123.woff2") format("woff2")')
        })

        it('generates separate rules for unicode-range subsets', () => {
            const family = makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [
                        { source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' },
                        { source: '/fonts/inter-latin-ext.woff2', format: 'woff2', unicodeRange: 'U+0100-024F' },
                    ],
                }],
            })

            const filePathMap = new Map([
                ['/fonts/inter-latin.woff2', 'assets/inter-latin.woff2'],
                ['/fonts/inter-latin-ext.woff2', 'assets/inter-latin-ext.woff2'],
            ])

            const css = generateFontFace(family, filePathMap)

            expect(css.match(/@font-face/g)).toHaveLength(2)
            expect(css).toContain('unicode-range: U+0000-00FF')
            expect(css).toContain('unicode-range: U+0100-024F')
        })

        it('generates multiple variants', () => {
            const family = makeFamily({
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                    { weight: 400, style: 'italic', files: [{ source: '/fonts/inter-400i.woff2', format: 'woff2' }] },
                ],
            })

            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/inter-700.woff2', 'assets/inter-700.woff2'],
                ['/fonts/inter-400i.woff2', 'assets/inter-400i.woff2'],
            ])

            const css = generateFontFace(family, filePathMap)

            expect(css.match(/@font-face/g)).toHaveLength(3)
            expect(css).toContain('font-weight: 700')
            expect(css).toContain('font-style: italic')
        })

        it('handles variable font weight ranges', () => {
            const family = makeFamily({
                variants: [{
                    weight: '100 900',
                    style: 'normal',
                    files: [{ source: '/fonts/inter-var.woff2', format: 'woff2' }],
                }],
            })

            const css = generateFontFace(family, new Map([
                ['/fonts/inter-var.woff2', 'assets/inter-var.woff2'],
            ]))

            expect(css).toContain('font-weight: 100 900')
        })
    })

    describe('generateFallbackFontFace', () => {
        it('generates fallback metrics', () => {
            const metrics: FallbackMetrics = {
                localFont: 'Arial',
                ascentOverride: '90.00%',
                descentOverride: '22.00%',
                lineGapOverride: '0.00%',
                sizeAdjust: '100.00%',
            }

            const css = generateFallbackFontFace('Inter', 'Inter fallback', metrics)

            expect(css).toContain('font-family: "Inter fallback"')
            expect(css).toContain('src: local("Arial")')
            expect(css).toContain('ascent-override: 90.00%')
            expect(css).toContain('descent-override: 22.00%')
            expect(css).toContain('line-gap-override: 0.00%')
            expect(css).toContain('size-adjust: 100.00%')
        })
    })

    describe('generateCssVariables', () => {
        it('generates CSS variables for families', () => {
            const families = [
                makeFamily(),
                makeFamily({ family: 'Roboto', variable: '--font-roboto' }),
            ]

            const css = generateCssVariables(families)

            expect(css).toContain(':root {')
            expect(css).toContain('--font-inter: "Inter", "Inter fallback"')
            expect(css).toContain('--font-roboto: "Roboto", "Roboto fallback"')
        })
    })

    describe('generateFontCss', () => {
        it('generates complete CSS with font-face and variables', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])

            const css = generateFontCss(families, filePathMap)

            expect(css).toContain('@font-face')
            expect(css).toContain(':root')
            expect(css).toContain('--font-inter')
        })

        it('includes fallback when provided', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])
            const fallbackMap = new Map([
                ['Inter', {
                    fallbackFamily: 'Inter fallback',
                    metrics: {
                        localFont: 'Arial',
                        ascentOverride: '90.00%',
                        descentOverride: '22.00%',
                        lineGapOverride: '0.00%',
                        sizeAdjust: '100.00%',
                    },
                }],
            ])

            const css = generateFontCss(families, filePathMap, fallbackMap)

            expect(css).toContain('font-family: "Inter fallback"')
            expect(css).toContain('src: local("Arial")')
        })

        it('skips fallback when family.fallback is false', () => {
            const families = [makeFamily({ fallback: false })]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])
            const fallbackMap = new Map([
                ['Inter', {
                    fallbackFamily: 'Inter fallback',
                    metrics: {
                        localFont: 'Arial',
                        ascentOverride: '90.00%',
                        descentOverride: '22.00%',
                        lineGapOverride: '0.00%',
                        sizeAdjust: '100.00%',
                    },
                }],
            ])

            const css = generateFontCss(families, filePathMap, fallbackMap)

            expect(css).not.toContain('Inter fallback')
        })

        it('includes font classes in output', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])

            const css = generateFontCss(families, filePathMap)

            expect(css).toContain('.font-inter {')
            expect(css).toContain('font-family: var(--font-inter);')
        })
    })

    describe('generateFontClassForFamily', () => {
        it('generates a class for a single family', () => {
            const family = makeFamily()

            const css = generateFontClassForFamily(family)

            expect(css).toBe('.font-inter {\n  font-family: var(--font-inter);\n}')
        })

        it('uses custom variable name for class', () => {
            const family = makeFamily({ variable: '--font-sans' })

            const css = generateFontClassForFamily(family)

            expect(css).toBe('.font-sans {\n  font-family: var(--font-sans);\n}')
        })

        it('handles variable with unconventional prefix', () => {
            const family = makeFamily({ variable: '--my-custom-font' })

            const css = generateFontClassForFamily(family)

            expect(css).toBe('.my-custom-font {\n  font-family: var(--my-custom-font);\n}')
        })

        it('references the CSS variable regardless of fallback setting', () => {
            const family = makeFamily({ fallback: false })

            const css = generateFontClassForFamily(family)

            expect(css).toContain('font-family: var(--font-inter);')
        })
    })

    describe('generateFontClasses', () => {
        it('generates classes for multiple families', () => {
            const families = [
                makeFamily(),
                makeFamily({ family: 'Roboto', variable: '--font-roboto' }),
            ]

            const css = generateFontClasses(families)

            expect(css).toContain('.font-inter {')
            expect(css).toContain('.font-roboto {')
        })

        it('handles multi-word family slugs', () => {
            const families = [
                makeFamily({ family: 'JetBrains Mono', variable: '--font-jetbrains-mono' }),
            ]

            const css = generateFontClasses(families)

            expect(css).toContain('.font-jetbrains-mono {')
            expect(css).toContain('font-family: var(--font-jetbrains-mono);')
        })
    })

    describe('generateFamilyStyles', () => {
        it('includes font class in each family CSS fragment', () => {
            const families = [
                makeFamily(),
                makeFamily({ family: 'Roboto', variable: '--font-roboto', variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [{ source: '/fonts/roboto-400.woff2', format: 'woff2' }],
                }] }),
            ]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
                ['/fonts/roboto-400.woff2', 'assets/roboto-400.woff2'],
            ])

            const { familyStyles } = generateFamilyStyles(families, filePathMap)

            expect(familyStyles['Inter']).toContain('.font-inter {')
            expect(familyStyles['Inter']).toContain('font-family: var(--font-inter);')
            expect(familyStyles['Roboto']).toContain('.font-roboto {')
            expect(familyStyles['Roboto']).toContain('font-family: var(--font-roboto);')
        })
    })
})

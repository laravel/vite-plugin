import { describe, expect, it } from 'vitest'
import { generateFontFace, generateFallbackFontFace, generateCssVariables, generateFontCss, generateFontClasses, generateFontClassForFamily, generateFamilyStyles } from '../src/fonts/css'
import type { FallbackMetrics } from '../src/fonts/types'
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

        it('emits both ranged and non-ranged files when a variant mixes them', () => {
            const family = makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [
                        { source: '/fonts/inter-latin.woff2', format: 'woff2', unicodeRange: 'U+0000-00FF' },
                        { source: '/fonts/inter-fallback.ttf', format: 'ttf' },
                    ],
                }],
            })

            const filePathMap = new Map([
                ['/fonts/inter-latin.woff2', 'assets/inter-latin.woff2'],
                ['/fonts/inter-fallback.ttf', 'assets/inter-fallback.ttf'],
            ])

            const css = generateFontFace(family, filePathMap)

            expect(css.match(/@font-face/g)).toHaveLength(2)
            expect(css).toContain('unicode-range: U+0000-00FF')
            expect(css).toContain('assets/inter-latin.woff2')
            expect(css).toContain('assets/inter-fallback.ttf')
            expect(css).not.toContain('unicode-range: undefined')
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
        it('generates fallback metrics without requiring the real family name', () => {
            const metrics: FallbackMetrics = {
                localFont: 'Arial',
                ascentOverride: '90.00%',
                descentOverride: '22.00%',
                lineGapOverride: '0.00%',
                sizeAdjust: '100.00%',
            }

            const css = generateFallbackFontFace('Inter fallback', metrics)

            expect(css).toBe([
                '@font-face {',
                '  font-family: "Inter fallback";',
                '  src: local("Arial");',
                '  ascent-override: 90.00%;',
                '  descent-override: 22.00%;',
                '  line-gap-override: 0.00%;',
                '  size-adjust: 100.00%;',
                '}',
            ].join('\n'))
        })
    })

    describe('generateCssVariables', () => {
        it('generates CSS variables for families with optimized fallbacks', () => {
            const families = [
                makeFamily(),
                makeFamily({ family: 'Roboto', alias: 'roboto', variable: '--font-roboto' }),
            ]

            const css = generateCssVariables(families)

            expect(css).toContain(':root {')
            expect(css).toContain('--font-inter: "Inter", "Inter fallback"')
            expect(css).toContain('--font-roboto: "Roboto", "Roboto fallback"')
        })

        it('omits optimized fallback when optimizedFallbacks is false', () => {
            const families = [makeFamily({ optimizedFallbacks: false })]
            const css = generateCssVariables(families)

            expect(css).toContain('--font-inter: "Inter";')
            expect(css).not.toContain('fallback')
        })

        it('includes user-specified fallbacks in CSS variable value', () => {
            const families = [makeFamily({ fallbacks: ['system-ui', 'sans-serif'] })]
            const css = generateCssVariables(families)

            expect(css).toContain('--font-inter: "Inter", "Inter fallback", system-ui, sans-serif;')
        })

        it('includes both optimized fallback and user fallbacks in correct order', () => {
            const families = [makeFamily({
                optimizedFallbacks: true,
                fallbacks: ['system-ui', 'sans-serif'],
            })]
            const css = generateCssVariables(families)

            expect(css).toContain('"Inter", "Inter fallback", system-ui, sans-serif')
        })

        it('includes only user fallbacks when optimizedFallbacks is false', () => {
            const families = [makeFamily({
                optimizedFallbacks: false,
                fallbacks: ['system-ui', 'sans-serif'],
            })]
            const css = generateCssVariables(families)

            expect(css).toContain('"Inter", system-ui, sans-serif')
            expect(css).not.toContain('fallback')
        })

        it('handles empty fallbacks with optimizedFallbacks false', () => {
            const families = [makeFamily({ optimizedFallbacks: false, fallbacks: [] })]
            const css = generateCssVariables(families)

            expect(css).toContain('--font-inter: "Inter";')
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
                ['inter', {
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

        it('skips fallback when optimizedFallbacks is false', () => {
            const families = [makeFamily({ optimizedFallbacks: false })]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])
            const fallbackMap = new Map([
                ['inter', {
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

        it('uses 2-space indentation inside every block so rendered output stays readable', () => {
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

            const css = generateFontCss(families, filePathMap)

            const indentedPropertyLines = css
                .split('\n')
                .filter(line => /:\s/.test(line) && line.includes(';'))

            expect(indentedPropertyLines.length).toBeGreaterThan(0)
            for (const line of indentedPropertyLines) {
                expect(line.startsWith('  ')).toBe(true)
                expect(line.startsWith('    ')).toBe(false)
                expect(line.startsWith('\t')).toBe(false)
            }
        })

        it('separates blocks by exactly one blank line (no triple newlines in generated CSS)', () => {
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

            const css = generateFontCss(families, filePathMap)

            expect(css).not.toMatch(/\n\n\n/)
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
            const family = makeFamily({ optimizedFallbacks: false })

            const css = generateFontClassForFamily(family)

            expect(css).toContain('font-family: var(--font-inter);')
        })
    })

    describe('generateFontClasses', () => {
        it('generates classes for multiple families', () => {
            const families = [
                makeFamily(),
                makeFamily({ family: 'Roboto', alias: 'roboto', variable: '--font-roboto' }),
            ]

            const css = generateFontClasses(families)

            expect(css).toContain('.font-inter {')
            expect(css).toContain('.font-roboto {')
        })

        it('handles multi-word family slugs', () => {
            const families = [
                makeFamily({ family: 'JetBrains Mono', alias: 'jetbrains-mono', variable: '--font-jetbrains-mono' }),
            ]

            const css = generateFontClasses(families)

            expect(css).toContain('.font-jetbrains-mono {')
            expect(css).toContain('font-family: var(--font-jetbrains-mono);')
        })
    })

    describe('generateFamilyStyles', () => {
        it('keys output by alias', () => {
            const families = [
                makeFamily(),
                makeFamily({ family: 'Roboto', alias: 'roboto', variable: '--font-roboto', variants: [{
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

            expect(familyStyles['inter']).toContain('.font-inter {')
            expect(familyStyles['inter']).toContain('font-family: var(--font-inter);')
            expect(familyStyles['roboto']).toContain('.font-roboto {')
            expect(familyStyles['roboto']).toContain('font-family: var(--font-roboto);')
        })

        it('CSS variables are a per-alias map (not a monolithic :root string)', () => {
            const families = [makeFamily({ alias: 'sans' })]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])

            const { variables } = generateFamilyStyles(families, filePathMap)

            expect(typeof variables).toBe('object')
            expect(variables['sans']).toBeDefined()
            expect(variables['sans']).toContain('--font-inter')
            expect(variables['sans']).toContain('"Inter"')
            expect(variables['sans']).not.toContain(':root')
            expect(variables['sans']?.trim().endsWith(';')).toBe(true)
        })

        it('CSS variables map ends each declaration with a trailing semicolon, no leading whitespace', () => {
            const families = [
                makeFamily({ alias: 'sans' }),
                makeFamily({
                    family: 'JetBrains Mono',
                    alias: 'mono',
                    variable: '--font-mono',
                    optimizedFallbacks: false,
                    fallbacks: ['monospace'],
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

            const { variables } = generateFamilyStyles(families, filePathMap)

            expect(variables['sans']).toBe('--font-inter: "Inter", "Inter fallback";')
            expect(variables['mono']).toBe('--font-mono: "JetBrains Mono", monospace;')
        })

        it('font-face rules still use actual font-family name', () => {
            const families = [makeFamily({ alias: 'sans' })]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])

            const { familyStyles } = generateFamilyStyles(families, filePathMap)

            expect(familyStyles['sans']).toContain('font-family: "Inter"')
        })

        it('includes fallback in family CSS when optimizedFallbacks is true', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])
            const fallbackMap = new Map([
                ['inter', {
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

            const { familyStyles } = generateFamilyStyles(families, filePathMap, fallbackMap)

            expect(familyStyles['inter']).toContain('font-family: "Inter fallback"')
        })

        it('produces byte-identical output for a fixed fixture (refactor regression guard)', () => {
            const families = [makeFamily()]
            const filePathMap = new Map([
                ['/fonts/inter-400.woff2', 'assets/inter-400.woff2'],
            ])
            const fallbackMap = new Map([
                ['inter', {
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

            const { familyStyles } = generateFamilyStyles(families, filePathMap, fallbackMap)

            expect(familyStyles['inter']).toBe([
                '@font-face {',
                '  font-family: "Inter";',
                '  font-style: normal;',
                '  font-weight: 400;',
                '  font-display: swap;',
                '  src: url("assets/inter-400.woff2") format("woff2");',
                '}',
                '',
                '@font-face {',
                '  font-family: "Inter fallback";',
                '  src: local("Arial");',
                '  ascent-override: 90.00%;',
                '  descent-override: 22.00%;',
                '  line-gap-override: 0.00%;',
                '  size-adjust: 100.00%;',
                '}',
                '',
                '.font-inter {',
                '  font-family: var(--font-inter);',
                '}',
            ].join('\n'))
        })
    })
})

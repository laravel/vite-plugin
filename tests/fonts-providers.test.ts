import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { parseFontFaceCss } from '../src/fonts/css-parser'
import { buildCss2Url, resolveRemoteVariants } from '../src/fonts/providers/resolve-remote'
import * as resolveRemoteModule from '../src/fonts/providers/resolve-remote'
import * as cache from '../src/fonts/cache'
import { google } from '../src/fonts/index'

const GOOGLE_INTER_CSS = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/providers/google-inter.css'),
    'utf-8',
)

describe('fonts providers', () => {
    describe('buildCss2Url', () => {
        it('includes default latin subset', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter'))

            expect(url).toContain('&subset=latin')
        })

        it('includes configured subsets', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter', {
                subsets: ['latin', 'cyrillic'],
            }))

            expect(url).toContain('&subset=latin,cyrillic')
        })

        it('builds correct axes for italic styles', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter', {
                weights: [400],
                styles: ['normal', 'italic'],
            }))

            expect(url).toContain('ital,wght@')
            expect(url).toContain('0,400')
            expect(url).toContain('1,400')
        })

        it('builds correct axes for normal-only styles', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter', {
                weights: [400, 700],
            }))

            expect(url).toContain('wght@400;700')
            expect(url).not.toContain('ital')
        })

        it('replaces spaces in family names', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Open Sans'))

            expect(url).toContain('family=Open+Sans')
        })

        it('dedupes repeated weights', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter', {
                weights: [400, 400, 700],
            }))

            const tuples = url.match(/wght@([^&]+)/)![1].split(';')

            expect(tuples).toEqual(['400', '700'])
        })

        it('dedupes repeated styles', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter', {
                weights: [400],
                styles: ['normal', 'normal'],
            }))

            const tuples = url.match(/wght@([^&]+)/)![1].split(';')

            expect(tuples).toEqual(['400'])
        })

        it('dedupes the italic+weight matrix', () => {
            const url = buildCss2Url('https://fonts.googleapis.com/css2', google('Inter', {
                weights: [400, 400, 700],
                styles: ['normal', 'italic', 'normal'],
            }))

            const tuples = url.match(/ital,wght@([^&]+)/)![1].split(';')

            expect(tuples).toEqual(['0,400', '0,700', '1,400', '1,700'])
        })
    })

    describe('css parser', () => {
        it('parses multiple @font-face rules', () => {
            const faces = parseFontFaceCss(GOOGLE_INTER_CSS)
            expect(faces.length).toBe(3)
        })

        it('extracts font-family', () => {
            const faces = parseFontFaceCss(GOOGLE_INTER_CSS)
            expect(faces.every(f => f.family === 'Inter')).toBe(true)
        })

        it('extracts font-weight', () => {
            const faces = parseFontFaceCss(GOOGLE_INTER_CSS)
            const weights = faces.map(f => f.weight)
            expect(weights).toContain(400)
            expect(weights).toContain(700)
        })

        it('extracts font-style', () => {
            const faces = parseFontFaceCss(GOOGLE_INTER_CSS)
            expect(faces.every(f => f.style === 'normal')).toBe(true)
        })

        it('preserves unicode-range', () => {
            const faces = parseFontFaceCss(GOOGLE_INTER_CSS)
            const withRange = faces.filter(f => f.unicodeRange)
            expect(withRange.length).toBe(3)
            expect(withRange[0].unicodeRange).toContain('U+0000-00FF')
        })

        it('extracts src url and format', () => {
            const faces = parseFontFaceCss(GOOGLE_INTER_CSS)
            expect(faces[0].src.length).toBeGreaterThanOrEqual(1)
            expect(faces[0].src[0].url).toContain('fonts.gstatic.com')
            expect(faces[0].src[0].format).toBe('woff2')
        })

        it('handles empty CSS', () => {
            expect(parseFontFaceCss('')).toEqual([])
        })

        it('handles CSS with no @font-face rules', () => {
            expect(parseFontFaceCss('body { color: red; }')).toEqual([])
        })

        it('handles @font-face without src', () => {
            const faces = parseFontFaceCss('@font-face { font-family: "Test"; }')
            expect(faces).toEqual([])
        })

        it('parses variable font weight ranges', () => {
            const css = `@font-face {
                font-family: 'Inter';
                font-style: normal;
                font-weight: 100 900;
                src: url(https://example.com/inter-var.woff2) format('woff2');
            }`

            const faces = parseFontFaceCss(css)
            expect(faces).toHaveLength(1)
            expect(faces[0].weight).toBe('100 900')
        })

        it('infers format from URL extension when format() is missing', () => {
            const css = `@font-face {
                font-family: 'Test';
                font-style: normal;
                font-weight: 400;
                src: url(https://example.com/font.woff2);
            }`

            const faces = parseFontFaceCss(css)
            expect(faces).toHaveLength(1)
            expect(faces[0].src[0].format).toBe('woff2')
        })

        it('handles multiple url() entries in src', () => {
            const css = `@font-face {
                font-family: 'Test';
                src: url(https://example.com/font.woff2) format('woff2'),
                     url(https://example.com/font.woff) format('woff');
            }`

            const faces = parseFontFaceCss(css)
            expect(faces).toHaveLength(1)
            expect(faces[0].src).toHaveLength(2)
            expect(faces[0].src[0].format).toBe('woff2')
            expect(faces[0].src[1].format).toBe('woff')
        })

        it('normalizes truetype format to ttf', () => {
            const css = `@font-face {
                font-family: 'Test';
                src: url(https://example.com/font.ttf) format('truetype');
            }`

            const faces = parseFontFaceCss(css)
            expect(faces[0].src[0].format).toBe('ttf')
        })

        it('normalizes opentype format to otf', () => {
            const css = `@font-face {
                font-family: 'Test';
                src: url(https://example.com/font.otf) format('opentype');
            }`

            const faces = parseFontFaceCss(css)
            expect(faces[0].src[0].format).toBe('otf')
        })
    })

    describe('remote fetcher User-Agent', () => {
        let cacheDir: string
        let fetchTextSpy: ReturnType<typeof vi.spyOn>
        let fetchBinarySpy: ReturnType<typeof vi.spyOn>

        beforeEach(() => {
            cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-ua-test-'))
            fetchTextSpy = vi.spyOn(cache, 'fetchTextAndCache').mockResolvedValue(GOOGLE_INTER_CSS)
            fetchBinarySpy = vi.spyOn(cache, 'fetchAndCache').mockResolvedValue(Buffer.from('font-bytes'))
        })

        afterEach(() => {
            vi.restoreAllMocks()
            fs.rmSync(cacheDir, { recursive: true, force: true })
        })

        it('sends the same deterministic Chrome User-Agent on every call', async () => {
            const def = google('Inter')

            for (let i = 0; i < 5; i++) {
                await resolveRemoteVariants(def, cacheDir, 'https://fonts.googleapis.com/css2')
            }

            expect(fetchTextSpy).toHaveBeenCalledTimes(5)

            const agents = fetchTextSpy.mock.calls.map(([, , headers]) => (headers as Record<string, string>)['User-Agent'])
            const unique = new Set(agents)

            expect(unique.size).toBe(1)
            expect([...unique][0]).toMatch(/^Mozilla\/5\.0 .*Chrome\//)
            expect(fetchBinarySpy).toHaveBeenCalled()
        })

        it('no longer exports the multi-UA array or pickUserAgent helper', () => {
            const mod = resolveRemoteModule as unknown as Record<string, unknown>

            expect(mod.WOFF2_USER_AGENTS).toBeUndefined()
            expect(mod.pickUserAgent).toBeUndefined()
        })
    })
})

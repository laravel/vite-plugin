import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseFontFaceCss } from '../src/fonts/css-parser'

const GOOGLE_INTER_CSS = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/providers/google-inter.css'),
    'utf-8',
)

describe('fonts providers', () => {
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
})

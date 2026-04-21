import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fontaine', () => ({
    readMetrics: vi.fn(),
}))

import * as fontaine from 'fontaine'
import { generateFallbackMetrics } from '../src/fonts/fallback'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readMetricsMock = vi.mocked(fontaine.readMetrics as any)

// Static fallback metrics used by the impl. Tests intentionally hardcode the expected
// Arial/TNR/Courier-New xWidthAvg values so that any accidental edit to the table
// shows up as a failing assertion.
const ARIAL = { ascent: 1854, descent: -434, lineGap: 67, unitsPerEm: 2048, xWidthAvg: 904 }
const TIMES_NEW_ROMAN = { ascent: 1825, descent: -443, lineGap: 87, unitsPerEm: 2048, xWidthAvg: 832 }
const COURIER_NEW = { ascent: 1705, descent: -615, lineGap: 0, unitsPerEm: 2048, xWidthAvg: 1229 }

function pctOf(value: number): number {
    return parseFloat(value.toFixed(2))
}

describe('generateFallbackMetrics', () => {
    beforeEach(() => {
        readMetricsMock.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('computes size-adjust from Arial metrics for sans-serif fonts', async () => {
        const realFont = {
            ascent: 1950,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            xWidthAvg: 1100,
            category: 'sans-serif',
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/inter.woff2')

        expect(metrics).toBeDefined()
        expect(metrics!.localFont).toBe('Arial')

        const sizeAdjust = (realFont.xWidthAvg / realFont.unitsPerEm) / (ARIAL.xWidthAvg / ARIAL.unitsPerEm)
        expect(pctOf(parseFloat(metrics!.sizeAdjust))).toBeCloseTo(sizeAdjust * 100, 1)

        const adjustedEm = realFont.unitsPerEm * sizeAdjust
        expect(parseFloat(metrics!.ascentOverride)).toBeCloseTo((realFont.ascent / adjustedEm) * 100, 1)
        expect(parseFloat(metrics!.descentOverride)).toBeCloseTo((Math.abs(realFont.descent) / adjustedEm) * 100, 1)
        expect(parseFloat(metrics!.lineGapOverride)).toBeCloseTo((realFont.lineGap / adjustedEm) * 100, 1)
    })

    it('computes size-adjust from Times New Roman metrics for serif fonts', async () => {
        const realFont = {
            ascent: 1800,
            descent: -500,
            lineGap: 50,
            unitsPerEm: 2048,
            xWidthAvg: 900,
            category: 'serif',
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/playfair.woff2')

        expect(metrics!.localFont).toBe('Times New Roman')

        const sizeAdjust =
            (realFont.xWidthAvg / realFont.unitsPerEm) / (TIMES_NEW_ROMAN.xWidthAvg / TIMES_NEW_ROMAN.unitsPerEm)
        expect(parseFloat(metrics!.sizeAdjust)).toBeCloseTo(sizeAdjust * 100, 1)
    })

    it('computes size-adjust from Courier New metrics for monospace fonts', async () => {
        const realFont = {
            ascent: 1700,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            xWidthAvg: 1200,
            category: 'monospace',
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/jetbrains.woff2')

        expect(metrics!.localFont).toBe('Courier New')

        const sizeAdjust = (realFont.xWidthAvg / realFont.unitsPerEm) / (COURIER_NEW.xWidthAvg / COURIER_NEW.unitsPerEm)
        expect(parseFloat(metrics!.sizeAdjust)).toBeCloseTo(sizeAdjust * 100, 1)
    })

    it('defaults sizeAdjust to 1 and emits unscaled overrides when xWidthAvg is unavailable', async () => {
        const realFont = {
            ascent: 1950,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            category: 'sans-serif',
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/font.woff2')

        expect(metrics).toBeDefined()
        expect(parseFloat(metrics!.sizeAdjust)).toBeCloseTo(100, 1)
        expect(parseFloat(metrics!.ascentOverride)).toBeCloseTo((realFont.ascent / realFont.unitsPerEm) * 100, 1)
        expect(parseFloat(metrics!.descentOverride)).toBeCloseTo((Math.abs(realFont.descent) / realFont.unitsPerEm) * 100, 1)
        expect(parseFloat(metrics!.lineGapOverride)).toBeCloseTo((realFont.lineGap / realFont.unitsPerEm) * 100, 1)
    })

    it('defaults sizeAdjust to 1 when xWidthAvg is zero', async () => {
        const realFont = {
            ascent: 1950,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            xWidthAvg: 0,
            category: 'sans-serif',
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/zero.woff2')

        expect(metrics).toBeDefined()
        expect(parseFloat(metrics!.sizeAdjust)).toBeCloseTo(100, 1)
        expect(parseFloat(metrics!.ascentOverride)).toBeCloseTo((realFont.ascent / realFont.unitsPerEm) * 100, 1)
    })

    it('falls back to Arial metrics when the category is missing entirely', async () => {
        const realFont = {
            ascent: 1950,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            xWidthAvg: 1100,
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/no-category.woff2')

        expect(metrics!.localFont).toBe('Arial')

        const sizeAdjust = (realFont.xWidthAvg / realFont.unitsPerEm) / (ARIAL.xWidthAvg / ARIAL.unitsPerEm)
        expect(parseFloat(metrics!.sizeAdjust)).toBeCloseTo(sizeAdjust * 100, 1)
    })

    it('falls back to Arial metrics when the category is null', async () => {
        const realFont = {
            ascent: 1950,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            xWidthAvg: 1100,
            category: null,
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/null-category.woff2')

        expect(metrics!.localFont).toBe('Arial')
    })

    it('falls back to Arial metrics when the category is an unknown keyword', async () => {
        const realFont = {
            ascent: 1950,
            descent: -500,
            lineGap: 0,
            unitsPerEm: 2048,
            xWidthAvg: 1100,
            category: 'display',
        }
        readMetricsMock.mockResolvedValue(realFont)

        const metrics = await generateFallbackMetrics('/fake/display.woff2')

        expect(metrics!.localFont).toBe('Arial')

        const sizeAdjust = (realFont.xWidthAvg / realFont.unitsPerEm) / (ARIAL.xWidthAvg / ARIAL.unitsPerEm)
        expect(parseFloat(metrics!.sizeAdjust)).toBeCloseTo(sizeAdjust * 100, 1)
    })
})

import type { FallbackCategory, FallbackEntry, FallbackMetrics } from './types.js'

// Canonical OS/2 metrics for the three system fonts Fontaine uses. Values sourced
// from the capsize-css font metrics collection.
const FALLBACK_METRICS: Record<FallbackCategory, FallbackEntry> = {
    'sans-serif': {
        localFont: 'Arial',
        ascent: 1854,
        descent: -434,
        lineGap: 67,
        unitsPerEm: 2048,
        xWidthAvg: 904,
    },
    serif: {
        localFont: 'Times New Roman',
        ascent: 1825,
        descent: -443,
        lineGap: 87,
        unitsPerEm: 2048,
        xWidthAvg: 832,
    },
    monospace: {
        localFont: 'Courier New',
        ascent: 1705,
        descent: -615,
        lineGap: 0,
        unitsPerEm: 2048,
        xWidthAvg: 1229,
    },
}

function resolveFallbackCategory(category: unknown): FallbackCategory {
    const validCategories: FallbackCategory[] = ['sans-serif', 'serif', 'monospace']

    return validCategories.includes(category as FallbackCategory) ? category as FallbackCategory : 'sans-serif';
}

export async function generateFallbackMetrics(
    fontSource: string,
    warn: (message: string) => void = () => undefined,
): Promise<FallbackMetrics|undefined> {
    let fontaine

    try {
        // @ts-expect-error — fontaine is an optional peer dependency
        fontaine = await import('fontaine')
    } catch {
        warn('Optimized font fallbacks require the optional "fontaine" package. Install it, or set "optimizedFallbacks: false" on your fonts to disable the feature.')

        return undefined
    }

    try {
        const metrics = await fontaine.readMetrics(fontSource)

        if (! metrics) {
            warn(`Unable to read font metrics from [${fontSource}]. Skipping optimized fallback generation for this font.`)

            return undefined
        }

        const { ascent, descent, lineGap, unitsPerEm, xWidthAvg, category } = metrics

        if (ascent == null || descent == null || lineGap == null || unitsPerEm == null) {
            warn(`Unable to read font metrics from [${fontSource}]. Skipping optimized fallback generation for this font.`)

            return undefined
        }

        const fallback = FALLBACK_METRICS[resolveFallbackCategory(category)]

        const sizeAdjust = xWidthAvg
            ? (xWidthAvg / unitsPerEm) / (fallback.xWidthAvg / fallback.unitsPerEm)
            : 1

        const adjustedEm = unitsPerEm * sizeAdjust

        return {
            localFont: fallback.localFont,
            ascentOverride: `${(ascent / adjustedEm * 100).toFixed(2)}%`,
            descentOverride: `${(Math.abs(descent) / adjustedEm * 100).toFixed(2)}%`,
            lineGapOverride: `${(lineGap / adjustedEm * 100).toFixed(2)}%`,
            sizeAdjust: `${(sizeAdjust * 100).toFixed(2)}%`,
        }
    } catch (e) {
        warn(`Unable to generate an optimized font fallback from [${fontSource}]: ${e instanceof Error ? e.message : String(e)}`)

        return undefined
    }
}

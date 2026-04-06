import type { FallbackMetrics } from './types.js'

export async function generateFallbackMetrics(
    fontSource: string,
): Promise<FallbackMetrics|undefined> {
    try {
        // @ts-expect-error — fontaine is an optional peer dependency
        const fontaine = await import('fontaine')
        const metrics = await fontaine.readMetrics(fontSource)

        if (! metrics) {
            return undefined
        }

        const fallbackFont = metrics.category === 'serif' ? 'Times New Roman' : 'Arial'

        const { ascent, descent, lineGap, unitsPerEm } = metrics
        if (ascent == null || descent == null || lineGap == null || unitsPerEm == null) {
            return undefined
        }

        const sizeAdjust = 1
        const ascentOverride = ascent / (unitsPerEm * sizeAdjust)
        const descentOverride = Math.abs(descent) / (unitsPerEm * sizeAdjust)
        const lineGapOverride = lineGap / (unitsPerEm * sizeAdjust)

        return {
            localFont: fallbackFont,
            ascentOverride: `${(ascentOverride * 100).toFixed(2)}%`,
            descentOverride: `${(descentOverride * 100).toFixed(2)}%`,
            lineGapOverride: `${(lineGapOverride * 100).toFixed(2)}%`,
            sizeAdjust: `${(sizeAdjust * 100).toFixed(2)}%`,
        }
    } catch {
        return undefined
    }
}

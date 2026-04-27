import { parseFontFaceCss } from '../css-parser.js'
import { fetchTextAndCache, fetchAndCache, cacheKey } from '../cache.js'
import { buildResolvedFamily } from '../config.js'
import type { FontDefinition, ResolvedFontFamily, ResolvedFontFile, ResolvedFontVariant } from '../types.js'

const WOFF2_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function buildCss2Url(baseUrl: string, definition: FontDefinition): string {
    const family = definition.family.replace(/ /g, '+')
    const weights = definition.weights
    const styles = definition.styles

    const hasItalic = styles.includes('italic')
    const axes = hasItalic ? ['ital', 'wght'] : ['wght']
    const tuples = new Set<string>()

    for (const weight of weights) {
        for (const style of styles) {
            if (hasItalic) {
                const ital = style === 'italic' ? '1' : '0'

                tuples.add(`${ital},${weight}`)
            } else {
                tuples.add(`${weight}`)
            }
        }
    }

    const axisStr = axes.join(',')
    const tupleStr = [...tuples].sort().join(';')

    return `${baseUrl}?family=${family}:${axisStr}@${tupleStr}&display=${definition.display}&subset=${definition.subsets.join(",")}`;
}

export async function resolveRemoteVariants(
    definition: FontDefinition,
    cacheDir: string,
    baseUrl: string,
): Promise<ResolvedFontVariant[]> {
    const url = buildCss2Url(baseUrl, definition)
    const css = await fetchTextAndCache(url, cacheDir, {
        'User-Agent': WOFF2_USER_AGENT,
    })
    const faces = parseFontFaceCss(css)

    if (faces.length === 0) {
        throw new Error(
            `laravel-vite-plugin: ${definition.provider} returned no @font-face rules for "${definition.family}". ` +
            `Check the family name and requested weights/styles.`
        )
    }

    const variants: ResolvedFontVariant[] = []

    for (const face of faces) {
        const files: ResolvedFontFile[] = []

        for (const src of face.src) {
            await fetchAndCache(src.url, cacheDir)

            files.push({
                source: `${cacheDir}/${cacheKey(src.url)}`,
                format: src.format,
                unicodeRange: face.unicodeRange,
            })
        }

        variants.push({
            weight: face.weight,
            style: face.style,
            files,
        })
    }

    return variants
}

export async function resolveRemoteFont(
    definition: FontDefinition,
    cacheDir: string,
    baseUrl: string,
): Promise<ResolvedFontFamily> {
    const variants = await resolveRemoteVariants(definition, cacheDir, baseUrl)

    return buildResolvedFamily(definition, variants)
}

import { parseFontFaceCss } from '../css-parser.js'
import { fetchTextAndCache, fetchAndCache, cacheKey } from '../cache.js'
import { buildResolvedFamily } from '../config.js'
import type { FontDefinition, ResolvedFontFamily, ResolvedFontFile, ResolvedFontVariant } from '../types.js'

const WOFF2_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]

function pickUserAgent(): string {
    return WOFF2_USER_AGENTS[Math.floor(Math.random() * WOFF2_USER_AGENTS.length)]
}

export function buildCss2Url(baseUrl: string, definition: FontDefinition): string {
    const family = definition.family.replace(/ /g, '+')
    const weights = definition.weights
    const styles = definition.styles

    const axes: string[] = []
    const tuples: string[] = []

    const hasItalic = styles.includes('italic')

    if (hasItalic) {
        axes.push('ital')
    }

    axes.push('wght')

    for (const weight of weights) {
        for (const style of styles) {
            if (hasItalic) {
                const ital = style === 'italic' ? '1' : '0'
                tuples.push(`${ital},${weight}`)
            } else {
                tuples.push(`${weight}`)
            }
        }
    }

    tuples.sort()

    const axisStr = axes.join(',')
    const tupleStr = tuples.join(';')

    let url = `${baseUrl}?family=${family}:${axisStr}@${tupleStr}&display=${definition.display}`

    const subsets = definition.subsets
    url += `&subset=${subsets.join(',')}`

    return url
}

export async function resolveRemoteVariants(
    definition: FontDefinition,
    cacheDir: string,
    baseUrl: string,
): Promise<ResolvedFontVariant[]> {
    const url = buildCss2Url(baseUrl, definition)

    const css = await fetchTextAndCache(url, cacheDir, {
        'User-Agent': pickUserAgent(),
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

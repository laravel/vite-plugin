import { FORMAT_MIME } from './types.js'
import type {
    FontManifest,
    FontManifestPreload,
    FontManifestFamily,
    FontManifestVariant,
    FontManifestVariantFile,
    ResolvedFontFamily,
} from './types.js'

function variantKey(weight: string|number, style: string): string {
    return `${weight}:${style}`
}

function resolveEntries(
    families: ResolvedFontFamily[],
    pathMap: Map<string, string>,
    pathKey: 'file' | 'url',
): { preloads: FontManifestPreload[], familyEntries: Record<string, FontManifestFamily> } {
    const preloads: FontManifestPreload[] = []
    const familyEntries: Record<string, FontManifestFamily> = {}

    for (const family of families) {
        const variants: Record<string, FontManifestVariant> = {}

        for (const variant of family.variants) {
            const files: FontManifestVariantFile[] = variant.files.map(f => ({
                [pathKey]: pathMap.get(f.source),
                format: f.format,
                unicodeRange: f.unicodeRange,
            }))

            const key = variantKey(variant.weight, variant.style)

            if (variants[key]) {
                variants[key].files.push(...files)
            } else {
                variants[key] = { files }
            }

            for (const f of variant.files) {
                if (f.format === 'woff2') {
                    preloads.push({
                        family: family.family,
                        weight: variant.weight,
                        style: variant.style,
                        [pathKey]: pathMap.get(f.source),
                        as: 'font',
                        type: FORMAT_MIME[f.format],
                        crossorigin: 'anonymous',
                    } as FontManifestPreload)
                }
            }
        }

        familyEntries[family.family] = {
            variable: family.variable,
            tailwind: family.tailwind,
            fallbackFamily: family.fallback ? `${family.family} fallback` : undefined,
            variants,
        }
    }

    return { preloads, familyEntries }
}

export function buildManifest(
    families: ResolvedFontFamily[],
    cssFile: string,
    filePathMap: Map<string, string>,
    familyStyles: Record<string, string>,
    variables: string,
): FontManifest {
    const { preloads, familyEntries } = resolveEntries(families, filePathMap, 'file')

    return {
        version: 1,
        style: { file: cssFile, familyStyles, variables },
        preloads,
        families: familyEntries,
    }
}

export function buildDevManifest(
    families: ResolvedFontFamily[],
    inlineCss: string,
    urlMap: Map<string, string>,
    familyStyles: Record<string, string>,
    variables: string,
): FontManifest {
    const { preloads, familyEntries } = resolveEntries(families, urlMap, 'url')

    return {
        version: 1,
        style: { inline: inlineCss, familyStyles, variables },
        preloads,
        families: familyEntries,
    }
}

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

export function buildManifest(
    families: ResolvedFontFamily[],
    cssFile: string,
    filePathMap: Map<string, string>,
): FontManifest {
    const preloads: FontManifestPreload[] = []
    const familyEntries: Record<string, FontManifestFamily> = {}

    for (const family of families) {
        const variants: Record<string, FontManifestVariant> = {}

        for (const variant of family.variants) {
            const files: FontManifestVariantFile[] = variant.files.map(f => ({
                file: filePathMap.get(f.source),
                format: f.format,
                unicodeRange: f.unicodeRange,
            }))

            variants[variantKey(variant.weight, variant.style)] = { files }

            for (const f of variant.files) {
                if (f.format === 'woff2') {
                    preloads.push({
                        family: family.family,
                        weight: variant.weight,
                        style: variant.style,
                        file: filePathMap.get(f.source),
                        as: 'font',
                        type: FORMAT_MIME[f.format],
                        crossorigin: 'anonymous',
                    })
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

    return {
        version: 1,
        style: { file: cssFile },
        preloads,
        families: familyEntries,
    }
}

export function buildDevManifest(
    families: ResolvedFontFamily[],
    inlineCss: string,
    urlMap: Map<string, string>,
): FontManifest {
    const preloads: FontManifestPreload[] = []
    const familyEntries: Record<string, FontManifestFamily> = {}

    for (const family of families) {
        const variants: Record<string, FontManifestVariant> = {}

        for (const variant of family.variants) {
            const files: FontManifestVariantFile[] = variant.files.map(f => ({
                url: urlMap.get(f.source),
                format: f.format,
                unicodeRange: f.unicodeRange,
            }))

            variants[variantKey(variant.weight, variant.style)] = { files }

            for (const f of variant.files) {
                if (f.format === 'woff2') {
                    preloads.push({
                        family: family.family,
                        weight: variant.weight,
                        style: variant.style,
                        url: urlMap.get(f.source),
                        as: 'font',
                        type: FORMAT_MIME[f.format],
                        crossorigin: 'anonymous',
                    })
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

    return {
        version: 1,
        style: { inline: inlineCss },
        preloads,
        families: familyEntries,
    }
}

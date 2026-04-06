import type { ResolvedFontFamily, ResolvedFontFile, FontWeight, FallbackMetrics } from './types.js'

function formatWeight(weight: FontWeight): string {
    return String(weight)
}

function generateSrc(files: ResolvedFontFile[], filePathMap: Map<string, string>): string {
    return files
        .map(file => {
            const url = filePathMap.get(file.source) ?? file.source

            return `url("${url}") format("${file.format}")`
        })
        .join(',\n    ')
}

export function generateFontFace(
    family: ResolvedFontFamily,
    filePathMap: Map<string, string>,
): string {
    const rules: string[] = []

    for (const variant of family.variants) {
        if (variant.files.some(f => f.unicodeRange)) {
            for (const file of variant.files) {
                if (file.unicodeRange) {
                    const fileSrc = `url("${filePathMap.get(file.source) ?? file.source}") format("${file.format}")`
                    rules.push([
                        '@font-face {',
                        `  font-family: "${family.family}";`,
                        `  font-style: ${variant.style};`,
                        `  font-weight: ${formatWeight(variant.weight)};`,
                        `  font-display: ${family.display};`,
                        `  src: ${fileSrc};`,
                        `  unicode-range: ${file.unicodeRange};`,
                        '}',
                    ].join('\n'))
                }
            }
        } else {
            const src = generateSrc(variant.files, filePathMap)
            rules.push([
                '@font-face {',
                `  font-family: "${family.family}";`,
                `  font-style: ${variant.style};`,
                `  font-weight: ${formatWeight(variant.weight)};`,
                `  font-display: ${family.display};`,
                `  src: ${src};`,
                '}',
            ].join('\n'))
        }
    }

    return rules.join('\n\n')
}

export function generateFallbackFontFace(
    family: string,
    fallbackFamily: string,
    metrics: FallbackMetrics,
): string {
    return [
        '@font-face {',
        `  font-family: "${fallbackFamily}";`,
        `  src: local("${metrics.localFont}");`,
        `  ascent-override: ${metrics.ascentOverride};`,
        `  descent-override: ${metrics.descentOverride};`,
        `  line-gap-override: ${metrics.lineGapOverride};`,
        `  size-adjust: ${metrics.sizeAdjust};`,
        '}',
    ].join('\n')
}

export function generateCssVariables(families: ResolvedFontFamily[]): string {
    const vars = families.map(f =>
        f.fallback
            ? `  ${f.variable}: "${f.family}", "${f.family} fallback";`
            : `  ${f.variable}: "${f.family}";`
    )

    return `:root {\n${vars.join('\n')}\n}`
}

export function generateFontCss(
    families: ResolvedFontFamily[],
    filePathMap: Map<string, string>,
    fallbackMap?: Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>,
): string {
    const parts: string[] = []

    for (const family of families) {
        parts.push(generateFontFace(family, filePathMap))

        if (family.fallback && fallbackMap?.has(family.family)) {
            const fb = fallbackMap.get(family.family)!
            parts.push(generateFallbackFontFace(family.family, fb.fallbackFamily, fb.metrics))
        }
    }

    parts.push(generateCssVariables(families))

    return parts.join('\n\n') + '\n'
}

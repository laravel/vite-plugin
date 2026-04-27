import type { ResolvedFontFamily, ResolvedFontFile, FallbackMetrics } from './types.js'

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
        const rangedFiles = variant.files.filter(f => f.unicodeRange)
        const nonRangedFiles = variant.files.filter(f => ! f.unicodeRange)

        for (const file of rangedFiles) {
            const fileSrc = `url("${filePathMap.get(file.source) ?? file.source}") format("${file.format}")`

            rules.push([
                '@font-face {',
                `  font-family: "${family.family}";`,
                `  font-style: ${variant.style};`,
                `  font-weight: ${String(variant.weight)};`,
                `  font-display: ${family.display};`,
                `  src: ${fileSrc};`,
                `  unicode-range: ${file.unicodeRange};`,
                '}',
            ].join('\n'))
        }

        if (nonRangedFiles.length > 0) {
            const src = generateSrc(nonRangedFiles, filePathMap)

            rules.push([
                '@font-face {',
                `  font-family: "${family.family}";`,
                `  font-style: ${variant.style};`,
                `  font-weight: ${String(variant.weight)};`,
                `  font-display: ${family.display};`,
                `  src: ${src};`,
                '}',
            ].join('\n'))
        }
    }

    return rules.join('\n\n')
}

export function generateFallbackFontFace(
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

export function generateFontClassForFamily(family: ResolvedFontFamily): string {
    return `.${family.variable.replace(/^--/, '')} {\n  font-family: var(${family.variable});\n}`
}

export function generateFontClasses(families: ResolvedFontFamily[]): string {
    return families
        .map(f => generateFontClassForFamily(f))
        .join('\n\n')
}

function familyVariableDeclaration(family: ResolvedFontFamily): string {
    const parts = [`"${family.family}"`]

    if (family.optimizedFallbacks) {
        parts.push(`"${family.family} fallback"`)
    }

    if (family.fallbacks.length > 0) {
        parts.push(...family.fallbacks)
    }

    return `${family.variable}: ${parts.join(', ')};`
}

export function generateCssVariables(families: ResolvedFontFamily[]): string {
    const lines = families
        .map((f) => `  ${familyVariableDeclaration(f)}`)
        .join("\n");

    return [':root {', lines, '}'].join('\n')
}

export function generateCssVariablesMap(families: ResolvedFontFamily[]): Record<string, string> {
    const map: Record<string, string> = {}

    for (const family of families) {
        map[family.alias] = familyVariableDeclaration(family)
    }

    return map
}

function buildFamilyCss(
    family: ResolvedFontFamily,
    filePathMap: Map<string, string>,
    fallbackMap?: Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>,
): string {
    let css = generateFontFace(family, filePathMap)

    if (family.optimizedFallbacks && fallbackMap?.has(family.alias)) {
        const fb = fallbackMap.get(family.alias)!
        css += '\n\n' + generateFallbackFontFace(fb.fallbackFamily, fb.metrics)
    }

    return css
}

export function generateFamilyStyles(
    families: ResolvedFontFamily[],
    filePathMap: Map<string, string>,
    fallbackMap?: Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>,
): { familyStyles: Record<string, string>, variables: Record<string, string> } {
    const familyStyles: Record<string, string> = {}

    for (const family of families) {
        familyStyles[family.alias] = buildFamilyCss(family, filePathMap, fallbackMap)
            + '\n\n' + generateFontClassForFamily(family)
    }

    return {
        familyStyles,
        variables: generateCssVariablesMap(families),
    }
}

export function generateFontCss(
    families: ResolvedFontFamily[],
    filePathMap: Map<string, string>,
    fallbackMap?: Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>,
): string {
    const parts: string[] = families.map(f => buildFamilyCss(f, filePathMap, fallbackMap))

    parts.push(generateCssVariables(families))
    parts.push(generateFontClasses(families))

    return parts.join('\n\n') + '\n'
}

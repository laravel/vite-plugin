import path from 'path'
import fs from 'fs'
import type {
    BaseFontOptions,
    FontDefinition,
    FontFormat,
    FontProviderType,
    ResolvedFontFamily,
    ResolvedFontFile,
    ResolvedFontVariant,
} from './types.js'

const FORMAT_MAP: Record<string, FontFormat> = {
    '.woff2': 'woff2',
    '.woff': 'woff',
    '.ttf': 'ttf',
    '.otf': 'otf',
    '.eot': 'eot',
}

const SUPPORTED_EXTENSIONS = Object.keys(FORMAT_MAP)

export function familyToVariable(family: string): string {
    return '--font-' + family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function familyToSlug(family: string): string {
    return family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function aliasToVariable(alias: string): string {
    return '--font-' + alias
}

export function buildFontDefinition(
    family: string,
    provider: FontProviderType,
    options?: BaseFontOptions,
    extra?: Partial<FontDefinition>,
): FontDefinition {
    const alias = options?.alias ?? familyToSlug(family)

    return {
        family,
        alias,
        provider,
        variable: options?.variable ?? aliasToVariable(alias),
        tailwind: options?.tailwind,
        weights: options?.weights ?? [400],
        styles: options?.styles ?? ['normal'],
        subsets: options?.subsets ?? ['latin'],
        display: options?.display ?? 'swap',
        preload: options?.preload ?? true,
        fallbacks: options?.fallbacks ?? [],
        optimizedFallbacks: options?.optimizedFallbacks ?? true,
        ...extra,
    }
}

export function buildResolvedFamily(
    definition: FontDefinition,
    variants: ResolvedFontVariant[],
): ResolvedFontFamily {
    return {
        family: definition.family,
        alias: definition.alias,
        variable: definition.variable,
        tailwind: definition.tailwind,
        display: definition.display,
        optimizedFallbacks: definition.optimizedFallbacks,
        fallbacks: definition.fallbacks,
        preload: definition.preload,
        provider: definition.provider,
        variants,
    }
}

export function inferFormat(filePath: string): FontFormat {
    const ext = path.extname(filePath).toLowerCase()
    const format = FORMAT_MAP[ext]

    if (! format) {
        throw new Error(
            `laravel-vite-plugin: Unsupported font file format "${ext}" for file "${filePath}". ` +
            `Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
        )
    }

    return format
}

export function validateFontDefinition(definition: FontDefinition): void {
    if (! definition.family || typeof definition.family !== 'string' || definition.family.trim() === '') {
        throw new Error('laravel-vite-plugin: Font family name must be a non-empty string.')
    }

    if (! definition.alias || typeof definition.alias !== 'string' || definition.alias.trim() === '') {
        throw new Error(`laravel-vite-plugin: Font "${definition.family}" has an invalid or empty alias.`)
    }

    if (definition.variable !== undefined && typeof definition.variable !== 'string') {
        throw new Error(`laravel-vite-plugin: Font "${definition.family}" has an invalid variable name.`)
    }

    if (definition.provider === 'local') {
        const variants = definition._local?.variants
        if (! variants || variants.length === 0) {
            throw new Error(
                `laravel-vite-plugin: Local font "${definition.family}" must specify at least one variant.`
            )
        }

        for (const v of variants) {
            const sources = Array.isArray(v.src) ? v.src : [v.src]
            if (sources.length === 0 || sources.some(s => typeof s !== 'string' || s.trim() === '')) {
                throw new Error(
                    `laravel-vite-plugin: Local font "${definition.family}" has a variant with an invalid or empty src.`
                )
            }
        }
    }
}

export function mergeFontDefinitions(fonts: FontDefinition[]): FontDefinition[] {
    const byAlias = new Map<string, FontDefinition>()
    const result: FontDefinition[] = []

    for (const font of fonts) {
        const existing = byAlias.get(font.alias)

        if (! existing) {
            const clone = { ...font }
            if (font._local) {
                clone._local = { variants: [...font._local.variants] }
            }
            byAlias.set(font.alias, clone)
            result.push(clone)

            continue
        }

        if (existing.provider !== font.provider) {
            throw new Error(
                `laravel-vite-plugin: Cannot merge font definitions for alias "${font.alias}": ` +
                `provider mismatch ("${existing.provider}" vs "${font.provider}").`
            )
        }

        if (existing.variable !== font.variable) {
            throw new Error(
                `laravel-vite-plugin: Cannot merge font definitions for alias "${font.alias}": ` +
                `variable mismatch ("${existing.variable}" vs "${font.variable}").`
            )
        }

        if (existing.display !== font.display) {
            throw new Error(
                `laravel-vite-plugin: Cannot merge font definitions for alias "${font.alias}": ` +
                `display mismatch ("${existing.display}" vs "${font.display}").`
            )
        }

        if (JSON.stringify(existing.fallbacks) !== JSON.stringify(font.fallbacks)) {
            throw new Error(
                `laravel-vite-plugin: Cannot merge font definitions for alias "${font.alias}": ` +
                `fallbacks mismatch.`
            )
        }

        if (JSON.stringify(existing.preload) !== JSON.stringify(font.preload)) {
            throw new Error(
                `laravel-vite-plugin: Cannot merge font definitions for alias "${font.alias}": ` +
                `preload mismatch.`
            )
        }

        const weightSet = new Set(existing.weights.map(String))
        for (const w of font.weights) {
            if (! weightSet.has(String(w))) {
                existing.weights.push(w)
                weightSet.add(String(w))
            }
        }

        const styleSet = new Set(existing.styles)
        for (const s of font.styles) {
            if (! styleSet.has(s)) {
                existing.styles.push(s)
                styleSet.add(s)
            }
        }

        const subsetSet = new Set(existing.subsets)
        for (const s of font.subsets) {
            if (! subsetSet.has(s)) {
                existing.subsets.push(s)
                subsetSet.add(s)
            }
        }

        if (existing._local && font._local) {
            existing._local.variants.push(...font._local.variants)
        }
    }

    return result
}

export function validateFontsConfig(fonts: FontDefinition[]): FontDefinition[] {
    const merged = mergeFontDefinitions(fonts)
    const aliases = new Set<string>()
    const variables = new Set<string>()

    for (const font of merged) {
        validateFontDefinition(font)

        if (aliases.has(font.alias)) {
            throw new Error(
                `laravel-vite-plugin: Duplicate font alias "${font.alias}". ` +
                `Each alias must be unique. Use the "alias" option to disambiguate.`
            )
        }
        aliases.add(font.alias)

        if (variables.has(font.variable)) {
            throw new Error(
                `laravel-vite-plugin: Duplicate CSS variable "${font.variable}". ` +
                `Use the "variable" option to set a unique variable name.`
            )
        }
        variables.add(font.variable)
    }

    return merged
}

export function resolveLocalVariants(definition: FontDefinition, projectRoot: string): ResolvedFontVariant[] {
    const localConfig = definition._local!
    const variants: ResolvedFontVariant[] = []

    for (const v of localConfig.variants) {
        const sources = Array.isArray(v.src) ? v.src : [v.src]
        const files: ResolvedFontFile[] = []

        for (const src of sources) {
            const absolutePath = path.isAbsolute(src) ? src : path.resolve(projectRoot, src)

            if (! fs.existsSync(absolutePath)) {
                throw new Error(
                    `laravel-vite-plugin: Local font file not found: "${src}" ` +
                    `(resolved to "${absolutePath}") for font "${definition.family}".`
                )
            }

            files.push({
                source: absolutePath,
                format: inferFormat(absolutePath),
            })
        }

        variants.push({
            weight: v.weight,
            style: v.style ?? 'normal',
            files,
        })
    }

    return variants
}

export function resolveLocalFont(definition: FontDefinition, projectRoot: string): ResolvedFontFamily {
    return buildResolvedFamily(definition, resolveLocalVariants(definition, projectRoot))
}

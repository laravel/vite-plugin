import path from 'path'
import fs from 'fs'
import { glob } from 'tinyglobby'
import type {
    BaseFontOptions,
    FontDefinition,
    FontFormat,
    FontProviderType,
    FontStyle,
    FontWeight,
    LocalVariantDefinition,
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

const SUPPORTED_GLOB = `*.{${Object.values(FORMAT_MAP).map((_, i) => Object.keys(FORMAT_MAP)[i].slice(1)).join(',')}}`

const DEFAULT_WEIGHT = 400
const DEFAULT_STYLE: FontStyle = 'normal'

const WEIGHT_PATTERNS: [string, number][] = [
    ['extrabold', 800],
    ['ultrabold', 800],
    ['semibold', 600],
    ['demibold', 600],
    ['extralight', 200],
    ['ultralight', 200],
    ['hairline', 100],
    ['thin', 100],
    ['light', 300],
    ['regular', 400],
    ['normal', 400],
    ['medium', 500],
    ['black', 900],
    ['heavy', 900],
    ['bold', 700],
]

const FORMAT_PREFERENCE: FontFormat[] = ['woff2', 'woff', 'ttf', 'otf', 'eot']

function splitStem(stem: string): string[] {
    return stem.split(/[-_]/).filter(Boolean)
}

function stripStyleSuffix(segment: string): string {
    return segment.replace(/(?:italic|it|oblique)$/i, '')
}

export function inferWeightFromFilename(filePath: string): FontWeight {
    const stem = path.basename(filePath, path.extname(filePath))
    const segments = splitStem(stem)

    for (let i = segments.length - 1; i >= 0; i--) {
        const raw = segments[i]
        const stripped = stripStyleSuffix(raw)
        const candidate = stripped || raw
        const lc = candidate.toLowerCase()

        for (const [pattern, weight] of WEIGHT_PATTERNS) {
            if (lc === pattern) {
                return weight
            }
        }

        for (const [pattern, weight] of WEIGHT_PATTERNS) {
            if (lc.length > pattern.length && lc.endsWith(pattern)) {
                return weight
            }
        }

        const numMatch = candidate.match(/(?:^|[^\d])([1-9]00)$/)
        if (numMatch) {
            return parseInt(numMatch[1], 10)
        }
    }

    return DEFAULT_WEIGHT
}

export function inferStyleFromFilename(filePath: string): FontStyle {
    const stem = path.basename(filePath, path.extname(filePath))
    const segments = splitStem(stem)

    for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i]
        const lc = seg.toLowerCase()

        if (lc === 'italic' || lc === 'it' || /italic$/i.test(seg)) {
            return 'italic'
        }

        if (lc.endsWith('it') && lc.length > 2) {
            const prefix = lc.slice(0, -2)

            if (WEIGHT_PATTERNS.some(([pattern]) => prefix === pattern || prefix.endsWith(pattern))) {
                return 'italic'
            }
        }

        if (lc === 'oblique' || /oblique$/i.test(seg)) {
            return 'oblique'
        }
    }

    return DEFAULT_STYLE
}

export function inferLocalVariantFromFilename(filePath: string): { weight: FontWeight, style: FontStyle } {
    return {
        weight: inferWeightFromFilename(filePath),
        style: inferStyleFromFilename(filePath),
    }
}

export function looksLikeVariableFontFilename(filePath: string): boolean {
    const stem = path.basename(filePath, path.extname(filePath))

    return /\[.+\]/.test(stem)
}

async function discoverFromGlob(family: string, src: string, projectRoot: string): Promise<string[]> {
    const files = await glob(src, { cwd: projectRoot, absolute: true })
    const supported = files.filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))

    if (supported.length === 0) {
        throw new Error(
            `laravel-vite-plugin: Local font "${family}" shorthand src "${src}" matched no supported font files.`
        )
    }

    return supported
}

async function discoverFromDirectory(family: string, src: string, absoluteSrc: string): Promise<string[]> {
    const files = await glob(`**/${SUPPORTED_GLOB}`, { cwd: absoluteSrc, absolute: true })

    if (files.length === 0) {
        throw new Error(
            `laravel-vite-plugin: Local font "${family}" directory "${src}" contains no supported font files.`
        )
    }

    return files
}

async function discoverFontFiles(family: string, src: string, projectRoot: string): Promise<string[]> {
    const absoluteSrc = path.isAbsolute(src) ? src : path.resolve(projectRoot, src)

    if (/[*?{]/.test(src)) {
        return discoverFromGlob(family, src, projectRoot)
    }

    if (fs.existsSync(absoluteSrc) && fs.statSync(absoluteSrc).isDirectory()) {
        return discoverFromDirectory(family, src, absoluteSrc)
    }

    if (fs.existsSync(absoluteSrc) && fs.statSync(absoluteSrc).isFile()) {
        return [absoluteSrc]
    }

    throw new Error(
        `laravel-vite-plugin: Local font "${family}" shorthand src "${src}" ` +
        `does not exist (resolved to "${absoluteSrc}").`
    )
}

function rejectVariableFontFiles(family: string, files: string[]): void {
    for (const file of files) {
        if (looksLikeVariableFontFilename(file)) {
            throw new Error(
                `laravel-vite-plugin: Local font "${family}" shorthand discovered a variable font file "${path.basename(file)}". ` +
                `Variable fonts require explicit "variants" with a weight range instead of shorthand "src".`
            )
        }
    }
}

function groupFilesByVariant(files: string[]): ResolvedFontVariant[] {
    const groups = new Map<string, { weight: FontWeight, style: FontStyle, files: ResolvedFontFile[] }>()

    for (const file of files) {
        const { weight, style } = inferLocalVariantFromFilename(file)
        const key = `${weight}:${style}`

        if (! groups.has(key)) {
            groups.set(key, { weight, style, files: [] })
        }

        groups.get(key)!.files.push({
            source: file,
            format: inferFormat(file),
        })
    }

    for (const group of groups.values()) {
        group.files.sort((a, b) =>
            FORMAT_PREFERENCE.indexOf(a.format) - FORMAT_PREFERENCE.indexOf(b.format)
        )
    }

    return Array.from(groups.values()).sort((a, b) => {
        const wA = typeof a.weight === 'number' ? a.weight : parseInt(String(a.weight), 10)
        const wB = typeof b.weight === 'number' ? b.weight : parseInt(String(b.weight), 10)
        if (wA !== wB) return wA - wB

        return a.style.localeCompare(b.style)
    })
}

export async function resolveLocalShorthandVariants(
    definition: FontDefinition,
    localConfig: { src: string },
    projectRoot: string,
): Promise<ResolvedFontVariant[]> {
    const discoveredFiles = await discoverFontFiles(definition.family, localConfig.src, projectRoot)
    discoveredFiles.sort()
    rejectVariableFontFiles(definition.family, discoveredFiles)

    return groupFilesByVariant(discoveredFiles)
}

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

    if (definition.variable !== undefined) {
        if (typeof definition.variable !== 'string' || definition.variable.trim() === '') {
            throw new Error(`laravel-vite-plugin: Font "${definition.family}" has an invalid or empty variable name.`)
        }

        if (! definition.variable.startsWith('--')) {
            throw new Error(
                `laravel-vite-plugin: Font "${definition.family}" variable "${definition.variable}" must start with "--".`
            )
        }
    }

    if (definition.provider !== 'local') {
        return
    }

    const localConfig = definition._local
    if (! localConfig) {
        throw new Error(
            `laravel-vite-plugin: Local font "${definition.family}" must specify either "src" or "variants".`
        )
    }

    if ('src' in localConfig && 'variants' in localConfig) {
        throw new Error(
            `laravel-vite-plugin: Local font "${definition.family}" cannot specify both "src" and "variants".`
        )
    }

    if ('src' in localConfig) {
        if (typeof localConfig.src !== 'string' || localConfig.src.trim() === '') {
            throw new Error(
                `laravel-vite-plugin: Local font "${definition.family}" has an invalid or empty "src".`
            )
        }

        return
    }

    const variants = localConfig.variants
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

export function mergeFontDefinitions(fonts: FontDefinition[]): FontDefinition[] {
    const byAlias = new Map<string, FontDefinition>()
    const result: FontDefinition[] = []

    for (const font of fonts) {
        const existing = byAlias.get(font.alias)

        if (! existing) {
            const clone = { ...font }
            if (font._local) {
                clone._local = 'variants' in font._local
                    ? { variants: [...font._local.variants] }
                    : { ...font._local }
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
            if ('variants' in existing._local && 'variants' in font._local) {
                existing._local.variants.push(...font._local.variants)
            } else {
                throw new Error(
                    `laravel-vite-plugin: Cannot merge font definitions for alias "${font.alias}": ` +
                    `incompatible local font shapes (one uses "src" and the other uses "variants").`
                )
            }
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

export function resolveLocalExplicitVariants(definition: FontDefinition, localConfig: { variants: LocalVariantDefinition[] }, projectRoot: string): ResolvedFontVariant[] {
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

        files.sort((a, b) =>
            FORMAT_PREFERENCE.indexOf(a.format) - FORMAT_PREFERENCE.indexOf(b.format)
        )

        const firstSrc = Array.isArray(v.src) ? v.src[0] : v.src
        const inferred = inferLocalVariantFromFilename(firstSrc)

        variants.push({
            weight: v.weight ?? inferred.weight,
            style: v.style ?? inferred.style,
            files,
        })
    }

    return variants
}

export async function resolveLocalVariants(definition: FontDefinition, projectRoot: string): Promise<ResolvedFontVariant[]> {
    const localConfig = definition._local!

    return 'variants' in localConfig
        ? resolveLocalExplicitVariants(definition, localConfig, projectRoot)
        : resolveLocalShorthandVariants(definition, localConfig, projectRoot)
}

export async function resolveLocalFont(definition: FontDefinition, projectRoot: string): Promise<ResolvedFontFamily> {
    return buildResolvedFamily(definition, await resolveLocalVariants(definition, projectRoot))
}

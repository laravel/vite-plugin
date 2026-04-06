import path from 'path'
import fs from 'fs'
import type {
    FontConfig,
    FontFormat,
    FontStyle,
    ResolvedFontFamily,
    ResolvedFontFile,
    ResolvedFontVariant,
    LocalProviderConfig,
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

export function validateFontConfig(config: FontConfig): void {
    if (! config.family || typeof config.family !== 'string' || config.family.trim() === '') {
        throw new Error('laravel-vite-plugin: Font family name must be a non-empty string.')
    }

    if (! config.provider || typeof config.provider !== 'object' || ! config.provider.type) {
        throw new Error(`laravel-vite-plugin: Font "${config.family}" has an invalid provider configuration.`)
    }

    if (config.variable !== undefined && typeof config.variable !== 'string') {
        throw new Error(`laravel-vite-plugin: Font "${config.family}" has an invalid variable name.`)
    }

    if (config.provider.type === 'local') {
        const src = config.provider.src
        if (! src || (typeof src === 'string' && src.trim() === '') || (Array.isArray(src) && src.length === 0)) {
            throw new Error(`laravel-vite-plugin: Local font "${config.family}" must specify at least one source file.`)
        }
    }
}

export function validateFontsConfig(fonts: FontConfig[]): void {
    const variables = new Set<string>()

    for (const font of fonts) {
        validateFontConfig(font)

        const variable = font.variable ?? familyToVariable(font.family)
        if (variables.has(variable)) {
            throw new Error(
                `laravel-vite-plugin: Duplicate CSS variable "${variable}". ` +
                `Use the "variable" option to set a unique variable name for font "${font.family}".`
            )
        }
        variables.add(variable)
    }
}

export function resolveLocalFont(config: FontConfig, projectRoot: string): ResolvedFontFamily {
    const provider = config.provider as LocalProviderConfig
    const sources = Array.isArray(provider.src) ? provider.src : [provider.src]
    const weights = config.weights ?? [400]
    const styles = config.styles ?? ['normal']

    const resolvedFiles: ResolvedFontFile[] = []

    for (const src of sources) {
        const absolutePath = path.isAbsolute(src) ? src : path.resolve(projectRoot, src)

        if (! fs.existsSync(absolutePath)) {
            throw new Error(
                `laravel-vite-plugin: Local font file not found: "${src}" ` +
                `(resolved to "${absolutePath}") for font "${config.family}".`
            )
        }

        resolvedFiles.push({
            source: absolutePath,
            format: inferFormat(absolutePath),
        })
    }

    const variants: ResolvedFontVariant[] = []

    for (const weight of weights) {
        for (const style of styles) {
            variants.push({
                weight,
                style: style as FontStyle,
                files: resolvedFiles,
            })
        }
    }

    return {
        family: config.family,
        variable: config.variable ?? familyToVariable(config.family),
        tailwind: config.tailwind,
        display: config.display ?? 'swap',
        fallback: config.fallback ?? true,
        provider: 'local',
        variants,
    }
}

export function resolveLocalFonts(fonts: FontConfig[], projectRoot: string): ResolvedFontFamily[] {
    return fonts
        .filter(f => f.provider.type === 'local')
        .map(f => resolveLocalFont(f, projectRoot))
}

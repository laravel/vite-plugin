export type FontProviderType = 'local' | 'google' | 'bunny' | 'fontsource'

export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot'

export type FontStyle = 'normal' | 'italic' | 'oblique'

export type FontWeight = number | string

export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional'

export type PreloadSelector = {
    weight: FontWeight
    style: FontStyle
}

export type BaseFontOptions = {
    /** Defaults to a slug of the family name. */
    alias?: string

    /** Defaults to `--font-{alias}`. */
    variable?: string

    tailwind?: string

    /** @default [400] */
    weights?: FontWeight[]

    /** @default ['normal'] */
    styles?: FontStyle[]

    /** @default ['latin'] */
    subsets?: string[]

    /** @default 'swap' */
    display?: FontDisplay

    /**
     * - `true`: preload all WOFF2 variants (default)
     * - `false`: do not preload
     * - `[{ weight, style }]`: preload only matching variants
     *
     * @default true
     */
    preload?: boolean | PreloadSelector[]

    /** @default [] */
    fallbacks?: string[]

    /**
     * Generate metric-optimized fallback font faces using fontaine.
     *
     * @default true
     */
    optimizedFallbacks?: boolean
}

export type LocalVariantDefinition = {
    /** Path(s) relative to the project root. */
    src: string | string[]
    weight: FontWeight
    /** @default 'normal' */
    style?: FontStyle
}

export type LocalFontOptions = Omit<BaseFontOptions, 'weights' | 'styles' | 'subsets'> & {
    variants: LocalVariantDefinition[]
}

export type RemoteFontOptions = BaseFontOptions

export type FontsourceFontOptions = BaseFontOptions & {
    /** Defaults to `@fontsource/{family-slug}`. */
    package?: string
}

export type FontDefinition = {
    family: string
    alias: string
    provider: FontProviderType
    variable: string
    tailwind?: string
    weights: FontWeight[]
    styles: FontStyle[]
    subsets: string[]
    display: FontDisplay
    preload: boolean | PreloadSelector[]
    fallbacks: string[]
    optimizedFallbacks: boolean
    /** @internal */
    _local?: { variants: LocalVariantDefinition[] }
    /** @internal */
    _fontsource?: { package?: string }
}

export type ResolvedFontVariant = {
    weight: FontWeight
    style: FontStyle
    files: ResolvedFontFile[]
}

export type ResolvedFontFile = {
    source: string
    format: FontFormat
    unicodeRange?: string
}

export type ResolvedFontFamily = {
    family: string
    alias: string
    variable: string
    tailwind?: string
    display: FontDisplay
    optimizedFallbacks: boolean
    fallbacks: string[]
    preload: boolean | PreloadSelector[]
    provider: FontProviderType
    variants: ResolvedFontVariant[]
}

export type FontManifest = {
    version: 1
    style: {
        file?: string
        inline?: string
        familyStyles: Record<string, string>
        variables: string
    }
    preloads: FontManifestPreload[]
    families: Record<string, FontManifestFamily>
}

export type FontManifestPreload = {
    alias: string
    family: string
    weight: FontWeight
    style: FontStyle
    file?: string
    url?: string
    as: 'font'
    type: string
    crossorigin: 'anonymous'
}

export type FontManifestFamily = {
    family: string
    variable: string
    tailwind?: string
    fallbackFamily?: string
    fallbacks?: string[]
    variants: Record<string, FontManifestVariant>
}

export type FontManifestVariant = {
    files: FontManifestVariantFile[]
}

export type FontManifestVariantFile = {
    file?: string
    url?: string
    format: FontFormat
    unicodeRange?: string
}

export type FallbackMetrics = {
    localFont: string
    ascentOverride: string
    descentOverride: string
    lineGapOverride: string
    sizeAdjust: string
}

export type ParsedFontFace = {
    family: string
    style: FontStyle
    weight: FontWeight
    src: ParsedFontSrc[]
    unicodeRange?: string
    display?: string
}

export type ParsedFontSrc = {
    url: string
    format: FontFormat
}

export const FORMAT_MIME: Record<FontFormat, string> = {
    woff2: 'font/woff2',
    woff: 'font/woff',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',
}

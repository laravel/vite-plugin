export type FontProviderType = 'local' | 'google' | 'bunny' | 'fontsource'

export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot'

export type FontStyle = 'normal' | 'italic' | 'oblique'

export type FontWeight = number | string

export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional'

export interface FontConfig {
    /**
     * The provider configuration (from google(), bunny(), fontsource(), or local()).
     */
    provider: FontProviderConfig

    /**
     * The font family name.
     */
    family: string

    /**
     * Weights to include.
     *
     * @default [400]
     */
    weights?: FontWeight[]

    /**
     * Styles to include.
     *
     * @default ['normal']
     */
    styles?: FontStyle[]

    /**
     * Subsets to include (for remote providers).
     *
     * @default ['latin']
     */
    subsets?: string[]

    /**
     * CSS variable name for this font.
     * Auto-generated from family name if not provided.
     *
     * @example '--font-inter'
     */
    variable?: string

    /**
     * Tailwind CSS font family key mapping.
     *
     * @example 'sans'
     */
    tailwind?: string

    /**
     * Font display strategy.
     *
     * @default 'swap'
     */
    display?: FontDisplay

    /**
     * Whether to generate fallback font metrics.
     *
     * @default true
     */
    fallback?: boolean
}

export type FontProviderConfig =
    | LocalProviderConfig
    | GoogleProviderConfig
    | BunnyProviderConfig
    | FontsourceProviderConfig

export interface LocalProviderConfig {
    type: 'local'

    /**
     * Path(s) to local font files, relative to the project root.
     */
    src: string|string[]
}

export interface GoogleProviderConfig {
    type: 'google'
}

export interface BunnyProviderConfig {
    type: 'bunny'
}

export interface FontsourceProviderConfig {
    type: 'fontsource'

    /**
     * The fontsource package name override.
     * Defaults to the family name slugified.
     */
    package?: string
}

export interface ResolvedFontVariant {
    weight: FontWeight
    style: FontStyle
    files: ResolvedFontFile[]
}

export interface ResolvedFontFile {
    source: string
    format: FontFormat
    unicodeRange?: string
}

export interface ResolvedFontFamily {
    family: string
    variable: string
    tailwind?: string
    display: FontDisplay
    fallback: boolean
    provider: FontProviderType
    variants: ResolvedFontVariant[]
}

export interface FontManifest {
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

export interface FontManifestPreload {
    family: string
    weight: FontWeight
    style: FontStyle
    file?: string
    url?: string
    as: 'font'
    type: string
    crossorigin: 'anonymous'
}

export interface FontManifestFamily {
    variable: string
    tailwind?: string
    fallbackFamily?: string
    variants: Record<string, FontManifestVariant>
}

export interface FontManifestVariant {
    files: FontManifestVariantFile[]
}

export interface FontManifestVariantFile {
    file?: string
    url?: string
    format: FontFormat
    unicodeRange?: string
}

export interface FallbackMetrics {
    localFont: string
    ascentOverride: string
    descentOverride: string
    lineGapOverride: string
    sizeAdjust: string
}

export interface ParsedFontFace {
    family: string
    style: FontStyle
    weight: FontWeight
    src: ParsedFontSrc[]
    unicodeRange?: string
    display?: string
}

export interface ParsedFontSrc {
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

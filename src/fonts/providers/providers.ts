import { buildFontDefinition } from '../config.js'
import type { FontDefinition, RemoteFontOptions, FontsourceFontOptions, LocalFontOptions } from '../types.js'

export function google(family: string, options?: RemoteFontOptions): FontDefinition {
    return buildFontDefinition(family, 'google', options)
}

export function bunny(family: string, options?: RemoteFontOptions): FontDefinition {
    return buildFontDefinition(family, 'bunny', options)
}

export function fontsource(family: string, options?: FontsourceFontOptions): FontDefinition {
    return buildFontDefinition(family, 'fontsource', options, {
        _fontsource: { package: options?.package },
    })
}

export function local(family: string, options: LocalFontOptions): FontDefinition {
    return buildFontDefinition(family, 'local', options, {
        weights: [],
        styles: [],
        subsets: [],
        _local: { variants: options.variants },
    })
}

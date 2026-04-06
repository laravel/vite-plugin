import { resolveRemoteFont } from './resolve-remote.js'
import type { FontConfig, ResolvedFontFamily } from '../types.js'

const BUNNY_FONTS_CSS_URL = 'https://fonts.bunny.net/css2'

export function resolveBunnyFont(
    config: FontConfig,
    cacheDir: string,
): Promise<ResolvedFontFamily> {
    return resolveRemoteFont(config, cacheDir, BUNNY_FONTS_CSS_URL, 'bunny')
}

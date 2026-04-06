import { resolveRemoteFont } from './resolve-remote.js'
import type { FontConfig, ResolvedFontFamily } from '../types.js'

const GOOGLE_FONTS_CSS_URL = 'https://fonts.googleapis.com/css2'

export function resolveGoogleFont(
    config: FontConfig,
    cacheDir: string,
): Promise<ResolvedFontFamily> {
    return resolveRemoteFont(config, cacheDir, GOOGLE_FONTS_CSS_URL, 'google')
}

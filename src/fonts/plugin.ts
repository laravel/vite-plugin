import fs from 'fs'
import path from 'path'
import { validateFontsConfig, resolveLocalFonts, familyToSlug } from './config.js'
import { generateFontCss, generateFamilyStyles } from './css.js'
import { buildManifest, buildDevManifest } from './manifest.js'
import { resolveCacheDir } from './cache.js'
import { resolveGoogleFont } from './providers/resolve-google.js'
import { resolveBunnyFont } from './providers/resolve-bunny.js'
import { resolveFontsourceFont } from './providers/resolve-fontsource.js'
import { generateFallbackMetrics } from './fallback.js'
import { buildDevUrlMap, createFontMiddleware } from './dev-server.js'
import type { Plugin, ResolvedConfig } from 'vite'
import type { FontConfig, ResolvedFontFamily, FallbackMetrics } from './types.js'

let exitHandlersBound = false

async function resolveFontFamilies(
    fonts: FontConfig[],
    projectRoot: string,
    cacheDir: string,
): Promise<ResolvedFontFamily[]> {
    const families: ResolvedFontFamily[] = [
        ...resolveLocalFonts(fonts, projectRoot),
    ]

    for (const config of fonts) {
        switch (config.provider.type) {
            case 'google':
                families.push(await resolveGoogleFont(config, cacheDir))

                break
            case 'bunny':
                families.push(await resolveBunnyFont(config, cacheDir))

                break
            case 'fontsource':
                families.push(resolveFontsourceFont(config, projectRoot))

                break
        }
    }

    return families
}

async function buildFallbackMap(
    families: ResolvedFontFamily[],
): Promise<Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>> {
    const fallbackMap = new Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>()

    for (const family of families) {
        if (! family.fallback) {
            continue
        }

        const firstFile = family.variants[0]?.files[0]
        if (! firstFile) {
            continue
        }

        const metrics = await generateFallbackMetrics(firstFile.source)
        if (metrics) {
            fallbackMap.set(family.family, {
                fallbackFamily: `${family.family} fallback`,
                metrics,
            })
        }
    }

    return fallbackMap
}

function emitFontAssets(
    families: ResolvedFontFamily[],
    emitFile: (opts: { type: 'asset', name: string, source: Buffer }) => string,
): Map<string, string> {
    const fileRefMap = new Map<string, string>()

    for (const family of families) {
        for (const variant of family.variants) {
            for (const file of variant.files) {
                if (fileRefMap.has(file.source)) {
                    continue
                }

                const source = fs.readFileSync(file.source)
                const slug = familyToSlug(family.family)
                const ext = file.format === 'woff2' ? '.woff2' : `.${file.format}`
                const name = `${slug}-${variant.weight}-${variant.style}${ext}`

                const ref = emitFile({ type: 'asset', name, source })
                fileRefMap.set(file.source, ref)
            }
        }
    }

    return fileRefMap
}

export function resolveFontsPlugin(
    fonts: FontConfig[]|undefined,
    hotFile: string,
): Plugin[] {
    if (! fonts || fonts.length === 0) {
        return []
    }

    validateFontsConfig(fonts)

    let resolvedConfig: ResolvedConfig
    let resolvedFamilies: ResolvedFontFamily[] = []
    let cacheDir: string
    let hotManifestPath: string
    let fontsCssRef: string
    let fontsFileRefMap: Map<string, string>
    let fontsFallbackMap: Map<string, { fallbackFamily: string, metrics: FallbackMetrics }>

    return [{
        name: 'laravel:fonts',
        enforce: 'post',

        configResolved(config) {
            resolvedConfig = config
            cacheDir = resolveCacheDir(config.root)
            hotManifestPath = path.resolve(
                path.dirname(hotFile),
                'fonts-manifest.dev.json',
            )
        },

        async buildStart() {
            if (resolvedConfig.command !== 'build') {
                return
            }

            resolvedFamilies = await resolveFontFamilies(fonts, resolvedConfig.root, cacheDir)

            if (resolvedFamilies.length === 0) {
                return
            }

            fontsFileRefMap = emitFontAssets(resolvedFamilies, (opts) => this.emitFile(opts))
            fontsFallbackMap = await buildFallbackMap(resolvedFamilies)

            const placeholderPathMap = new Map<string, string>()
            for (const [source, ref] of fontsFileRefMap) {
                placeholderPathMap.set(source, `__FONT_REF_${ref}__`)
            }

            const css = generateFontCss(resolvedFamilies, placeholderPathMap, fontsFallbackMap)

            fontsCssRef = this.emitFile({
                type: 'asset',
                name: 'fonts.css',
                source: css,
            })
        },

        generateBundle(_, bundle) {
            if (resolvedConfig.command !== 'build' || resolvedFamilies.length === 0 || ! fontsCssRef) {
                return
            }

            const resolvedFilePathMap = new Map<string, string>()
            for (const [source, ref] of fontsFileRefMap) {
                resolvedFilePathMap.set(source, this.getFileName(ref))
            }

            const cssFileName = this.getFileName(fontsCssRef)
            const finalCss = generateFontCss(resolvedFamilies, resolvedFilePathMap, fontsFallbackMap)
            const { familyStyles, variables } = generateFamilyStyles(resolvedFamilies, resolvedFilePathMap, fontsFallbackMap)

            for (const [key, chunk] of Object.entries(bundle)) {
                if (key === cssFileName && chunk.type === 'asset') {
                    chunk.source = finalCss

                    break
                }
            }

            const manifest = buildManifest(resolvedFamilies, cssFileName, resolvedFilePathMap, familyStyles, variables)

            this.emitFile({
                type: 'asset',
                fileName: 'fonts-manifest.json',
                source: JSON.stringify(manifest, null, 2),
            })
        },

        configureServer(server) {
            const projectRoot = resolvedConfig.root

            server.httpServer?.once('listening', async () => {
                try {
                    resolvedFamilies = await resolveFontFamilies(fonts, projectRoot, cacheDir)

                    if (resolvedFamilies.length === 0) {
                        return
                    }

                    const devServerUrl = fs.existsSync(hotFile)
                        ? fs.readFileSync(hotFile, 'utf-8').trim()
                        : `http://localhost:${server.config.server.port ?? 5173}`

                    const fallbackMap = await buildFallbackMap(resolvedFamilies)
                    const urlMap = buildDevUrlMap(resolvedFamilies, devServerUrl)
                    const css = generateFontCss(resolvedFamilies, urlMap, fallbackMap)
                    const { familyStyles, variables } = generateFamilyStyles(resolvedFamilies, urlMap, fallbackMap)
                    const manifest = buildDevManifest(resolvedFamilies, css, urlMap, familyStyles, variables)

                    const hotManifestDir = path.dirname(hotManifestPath)
                    if (! fs.existsSync(hotManifestDir)) {
                        fs.mkdirSync(hotManifestDir, { recursive: true })
                    }

                    fs.writeFileSync(hotManifestPath, JSON.stringify(manifest, null, 2))

                    server.middlewares.use(createFontMiddleware(resolvedFamilies))
                } catch (e) {
                    server.config.logger.error(`[laravel:fonts] ${(e as Error).message}`)
                }
            })

            if (! exitHandlersBound) {
                const clean = () => {
                    if (fs.existsSync(hotManifestPath)) {
                        fs.rmSync(hotManifestPath)
                    }
                }

                process.on('exit', clean)
                process.on('SIGINT', () => process.exit())
                process.on('SIGTERM', () => process.exit())
                process.on('SIGHUP', () => process.exit())

                exitHandlersBound = true
            }
        },
    }]
}

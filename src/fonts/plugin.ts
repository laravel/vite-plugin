import fs from 'fs'
import path from 'path'
import { validateFontsConfig, resolveLocalFont, familyToSlug } from './config.js'
import { generateFontCss, generateFamilyStyles } from './css.js'
import { buildManifest, buildDevManifest } from './manifest.js'
import { resolveCacheDir } from './cache.js'
import { resolveRemoteFont } from './providers/resolve-remote.js'
import { resolveFontsourceFont } from './providers/resolve-fontsource.js'
import { generateFallbackMetrics } from './fallback.js'
import { buildDevUrlMap, createFontMiddleware } from './dev-server.js'
import type { Plugin, ResolvedConfig } from 'vite'
import type { FontDefinition, ResolvedFontFamily, FallbackMetrics } from './types.js'

const REMOTE_CSS_URLS: Record<string, string> = {
    google: 'https://fonts.googleapis.com/css2',
    bunny: 'https://fonts.bunny.net/css2',
}

async function resolveFontFamilies(
    fonts: FontDefinition[],
    projectRoot: string,
    cacheDir: string,
): Promise<ResolvedFontFamily[]> {
    const families: ResolvedFontFamily[] = []

    for (const definition of fonts) {
        const remoteUrl = REMOTE_CSS_URLS[definition.provider]

        if (remoteUrl) {
            families.push(await resolveRemoteFont(definition, cacheDir, REMOTE_CSS_URLS[definition.provider]))

            return families
        }

        switch (definition.provider) {
            case 'fontsource':
                families.push(resolveFontsourceFont(definition, projectRoot))

                break
            case 'local':
                families.push(await resolveLocalFont(definition, projectRoot))

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
        if (! family.optimizedFallbacks) {
            continue
        }

        const firstFile = family.variants[0]?.files[0]
        if (! firstFile) {
            continue
        }

        const metrics = await generateFallbackMetrics(firstFile.source)
        if (metrics) {
            fallbackMap.set(family.alias, {
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

/** @internal Exported for tests; not part of the public plugin API. */
export function assertFileRefsResolved(
    families: ResolvedFontFamily[],
    fileRefMap: Map<string, string>,
): void {
    for (const family of families) {
        for (const variant of family.variants) {
            for (const file of variant.files) {
                if (! fileRefMap.has(file.source)) {
                    throw new Error(
                        `laravel-vite-plugin: Missing emitted asset for font "${family.family}" ` +
                        `(source "${file.source}").`
                    )
                }
            }
        }
    }
}

export function resolveFontsPlugin(
    fonts: FontDefinition[]|undefined,
    hotFile: string,
    buildDirectory: string,
): Plugin[] {
    if (! fonts || fonts.length === 0) {
        return []
    }

    const mergedFonts = validateFontsConfig(fonts)

    let resolvedConfig: ResolvedConfig
    let resolvedFamilies: ResolvedFontFamily[] = []
    let cacheDir: string
    let hotManifestPath: string
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

            resolvedFamilies = await resolveFontFamilies(mergedFonts, resolvedConfig.root, cacheDir)

            if (resolvedFamilies.length === 0) {
                return
            }

            fontsFileRefMap = emitFontAssets(resolvedFamilies, (opts) => this.emitFile(opts))
            fontsFallbackMap = await buildFallbackMap(resolvedFamilies)
        },

        generateBundle() {
            if (resolvedConfig.command !== 'build' || resolvedFamilies.length === 0) {
                return
            }

            assertFileRefsResolved(resolvedFamilies, fontsFileRefMap)

            const relativeFilePathMap = new Map<string, string>()
            const absoluteFilePathMap = new Map<string, string>()
            for (const [source, ref] of fontsFileRefMap) {
                const fileName = this.getFileName(ref)
                relativeFilePathMap.set(source, fileName)
                absoluteFilePathMap.set(source, `/${buildDirectory}/${fileName}`)
            }

            const finalCss = generateFontCss(resolvedFamilies, absoluteFilePathMap, fontsFallbackMap)
            const { familyStyles, variables } = generateFamilyStyles(resolvedFamilies, absoluteFilePathMap, fontsFallbackMap)

            const cssRef = this.emitFile({
                type: 'asset',
                name: 'fonts.css',
                source: finalCss,
            })

            const cssFileName = this.getFileName(cssRef)
            const manifest = buildManifest(resolvedFamilies, cssFileName, relativeFilePathMap, familyStyles, variables)

            this.emitFile({
                type: 'asset',
                fileName: 'fonts-manifest.json',
                source: JSON.stringify(manifest, null, 2),
            })
        },

        configureServer(server) {
            const projectRoot = resolvedConfig.root

            const fontMiddleware = createFontMiddleware()
            server.middlewares.use(fontMiddleware.middleware)

            server.httpServer?.once('listening', async () => {
                try {
                    resolvedFamilies = await resolveFontFamilies(mergedFonts, projectRoot, cacheDir)

                    if (resolvedFamilies.length === 0) {
                        return
                    }

                    const devServerUrl = fs.existsSync(hotFile)
                        ? fs.readFileSync(hotFile, 'utf-8').trim()
                        : `http://localhost:${server.config.server.port ?? 5173}`

                    fontMiddleware.update(resolvedFamilies)

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
                } catch (e) {
                    server.config.logger.error(`[laravel:fonts] ${(e as Error).message}`)
                }
            })

            const onExit = (): void => {
                try {
                    fs.rmSync(hotManifestPath, { force: true })
                } catch {
                    // Best-effort cleanup
                }
            }

            // Always register so the hot manifest is cleaned up on process
            // exit. In middleware mode there's no teardown signal, so this
            // listener lives for the rest of the Node process.
            process.on('exit', onExit)

            server.httpServer?.once('close', () => {
                onExit()
                process.removeListener('exit', onExit)
            })
        },
    }]
}

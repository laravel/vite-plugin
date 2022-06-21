import fs from 'fs'
import { AddressInfo } from 'net'
import path from 'path'
import colors from 'picocolors'
import { Plugin, loadEnv, UserConfig, ConfigEnv, Manifest, ResolvedConfig, SSROptions, normalizePath } from 'vite'

interface PluginConfig {
    /**
     * The path or paths of the entry points to compile.
     */
    input: string|string[]

    /**
     * Laravel's public directory.
     *
     * @default 'public'
     */
    publicDirectory?: string

    /**
     * The public subdirectory where compiled assets should be written.
     *
     * @default 'build'
     */
    buildDirectory?: string

    /**
     * The path of the SSR entry point.
     */
    ssr?: string|string[]

    /**
     * The directory where the SSR bundle should be written.
     *
     * @default 'storage/ssr'
     */
    ssrOutputDirectory?: string
}

interface LaravelPlugin extends Plugin {
    config: (config: UserConfig, env: ConfigEnv) => UserConfig
}

let exitHandlersBound = false

/**
 * Laravel plugin for Vite.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
export default function laravel(config: string|string[]|PluginConfig): LaravelPlugin {
    const pluginConfig = resolvePluginConfig(config)
    let viteDevServerUrl: string
    let resolvedConfig: ResolvedConfig
    const cssManifest: Manifest = {}

    const defaultAliases: Record<string, string> = {
        '@': '/resources/js',
    };

    return {
        name: 'laravel',
        enforce: 'post',
        config: (userConfig, { command, mode }) => {
            const ssr = !! userConfig.build?.ssr
            const env = loadEnv(mode, process.cwd(), '')
            const assetUrl = env.ASSET_URL ?? ''

            return {
                base: command === 'build' ? resolveBase(pluginConfig, assetUrl) : '',
                publicDir: false,
                build: {
                    manifest: !ssr,
                    outDir: userConfig.build?.outDir ?? resolveOutDir(pluginConfig, ssr),
                    rollupOptions: {
                        input: userConfig.build?.rollupOptions?.input ?? resolveInput(pluginConfig, ssr)
                    },
                },
                server: {
                    origin: '__laravel_vite_placeholder__',
                    ...(process.env.LARAVEL_SAIL ? {
                        host: '0.0.0.0',
                        port: env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173,
                        strictPort: true,
                    } : undefined)
                },
                resolve: {
                    alias: Array.isArray(userConfig.resolve?.alias)
                        ? [
                            ...userConfig.resolve?.alias ?? [],
                            ...Object.keys(defaultAliases).map(alias => ({
                                find: alias,
                                replacement: defaultAliases[alias]
                            }))
                        ]
                        : {
                            ...defaultAliases,
                            ...userConfig.resolve?.alias,
                        }
                },
                ssr: {
                    noExternal: noExternalInertiaHelpers(userConfig),
                },
            }
        },
        configResolved(config) {
            resolvedConfig = config
        },
        transform(code) {
            if (resolvedConfig.command === 'serve') {
                return code.replace(/__laravel_vite_placeholder__/g, viteDevServerUrl)
            }
        },
        configureServer(server) {
            const hotFile = path.join(pluginConfig.publicDirectory, 'hot')

            server.httpServer?.once('listening', () => {
                const address = server.httpServer?.address()

                const isAddressInfo = (x: string|AddressInfo|null|undefined): x is AddressInfo => typeof x === 'object'
                if (isAddressInfo(address)) {
                    const protocol = server.config.server.https ? 'https' : 'http'
                    const host = address.family === 'IPv6' ? `[${address.address}]` : address.address
                    viteDevServerUrl = `${protocol}://${host}:${address.port}`
                    fs.writeFileSync(hotFile, viteDevServerUrl)

                    const envDir = resolvedConfig.envDir || process.cwd()
                    const appUrl = loadEnv('', envDir, 'APP_URL').APP_URL

                    setTimeout(() => {
                        server.config.logger.info(colors.red(`\n  Laravel ${laravelVersion(envDir)} `))
                        server.config.logger.info(`\n  > APP_URL: ` + colors.cyan(appUrl))
                    })
                }
            })

            if (exitHandlersBound) {
                return
            }

            const clean = () => {
                if (fs.existsSync(hotFile)) {
                    fs.rmSync(hotFile)
                }
            }

            process.on('exit', clean)
            process.on('SIGINT', process.exit)
            process.on('SIGTERM', process.exit)
            process.on('SIGHUP', process.exit)

            exitHandlersBound = true
        },

        // The following two hooks are a workaround to help solve a "flash of unstyled content" with Blade.
        // They add any CSS entry points into the manifest because Vite does not currently do this.
        renderChunk(_, chunk) {
            const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
            const cssLangRE = new RegExp(cssLangs)

            if (! chunk.isEntry || chunk.facadeModuleId === null || ! cssLangRE.test(chunk.facadeModuleId)) {
                return null
            }

            const relativeChunkPath = normalizePath(path.relative(resolvedConfig.root, chunk.facadeModuleId))

            cssManifest[relativeChunkPath] = {
                /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
                /* @ts-ignore */
                file: Array.from(chunk.viteMetadata.importedCss)[0],
                src: relativeChunkPath,
                isEntry: true,
            }

            return null
        },
        writeBundle() {
            const manifestConfig = resolveManifestConfig(resolvedConfig)

            if (manifestConfig === false) {
                return;
            }

            const manifestPath = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir, manifestConfig)
            const manifest = JSON.parse(fs.readFileSync(manifestPath).toString())
            const newManifest = {
                ...manifest,
                ...cssManifest,
            }
            fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2))
        }
    }
}

/**
 * The version of Laravel being run.
 */
function laravelVersion(envDir?: string): string {
    try {
        const composer = JSON.parse(fs.readFileSync(`${envDir}composer.lock`).toString())

        return composer.packages?.find((composerPackage: {name: string}) => composerPackage.name === 'laravel/framework')?.version ?? ''
    } catch {
        return ''
    }
}

/**
 * Convert the users configuration into a standard structure with defaults.
 */
function resolvePluginConfig(config: string|string[]|PluginConfig): Required<PluginConfig> {
    if (typeof config === 'undefined') {
        throw new Error('laravel-vite-plugin: missing configuration.')
    }

    if (typeof config === 'string' || Array.isArray(config)) {
        config = { input: config, ssr: config }
    }

    if (typeof config.input === 'undefined') {
        throw new Error('laravel-vite-plugin: missing configuration for "input".')
    }

    if (typeof config.publicDirectory === 'string') {
        config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, '')

        if (config.publicDirectory === '') {
            throw new Error('laravel-vite-plugin: publicDirectory must be a subdirectory. E.g. \'public\'.')
        }
    }

    if (typeof config.buildDirectory === 'string') {
        config.buildDirectory = config.buildDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '')

        if (config.buildDirectory === '') {
            throw new Error('laravel-vite-plugin: buildDirectory must be a subdirectory. E.g. \'build\'.')
        }
    }

    if (typeof config.ssrOutputDirectory === 'string') {
        config.ssrOutputDirectory = config.ssrOutputDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '')
    }

    return {
        input: config.input,
        publicDirectory: config.publicDirectory ?? 'public',
        buildDirectory: config.buildDirectory ?? 'build',
        ssr: config.ssr ?? config.input,
        ssrOutputDirectory: config.ssrOutputDirectory ?? 'storage/ssr',
    }
}

/**
 * Resolve the Vite base option from the configuration.
 */
function resolveBase(config: Required<PluginConfig>, assetUrl: string): string {
    return assetUrl + (! assetUrl.endsWith('/') ? '/' : '') + config.buildDirectory + '/'
}

/**
 * Resolve the Vite input path from the configuration.
 */
function resolveInput(config: Required<PluginConfig>, ssr: boolean): string|string[]|undefined {
    if (ssr) {
        return config.ssr
    }

    return config.input
}

/**
 * Resolve the Vite outDir path from the configuration.
 */
function resolveOutDir(config: Required<PluginConfig>, ssr: boolean): string|undefined {
    if (ssr) {
        return config.ssrOutputDirectory
    }

    return path.join(config.publicDirectory, config.buildDirectory)
}

/**
 * Resolve the Vite manifest config from the configuration.
 */
function resolveManifestConfig(config: ResolvedConfig): string|false
{
    const manifestConfig = config.build.ssr
        ? config.build.ssrManifest
        : config.build.manifest;

    if (manifestConfig === false) {
        return false
    }

    if (manifestConfig === true) {
        return config.build.ssr ? 'ssr-manifest.json' : 'manifest.json'
    }

    return manifestConfig
}

/**
 * Add the Interia helpers to the list of SSR dependencies that aren't externalized.
 *
 * @see https://vitejs.dev/guide/ssr.html#ssr-externals
 */
function noExternalInertiaHelpers(config: UserConfig): true|Array<string|RegExp> {
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    /* @ts-ignore */
    const userNoExternal = (config.ssr as SSROptions|undefined)?.noExternal
    const pluginNoExternal = ['laravel-vite-plugin']

    if (userNoExternal === true) {
        return true
    }

    if (typeof userNoExternal === 'undefined') {
        return pluginNoExternal
    }

    return [
        ...(Array.isArray(userNoExternal) ? userNoExternal : [userNoExternal]),
        ...pluginNoExternal,
    ]
}

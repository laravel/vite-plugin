import fs from 'fs'
import { AddressInfo } from 'net'
import path from 'path'
import colors from 'picocolors'
import { Plugin, loadEnv, UserConfig, ConfigEnv, ResolvedConfig } from 'vite'

interface PluginConfig {
    /**
     * The path or path of the entry points to compile.
     *
     * @default 'resources/js/app.js'
     */
    input: string|string[]|undefined

    /**
     * Laravel's public directory.
     *
     * @default 'public'
     */
    publicDirectory: string

    /**
     * The public subdirectory where compiled assets should be written.
     *
     * @default 'build'
     */
    buildDirectory: string

    /**
     * The path of the SSR entry point.
     *
     * @default 'resources/js/ssr.js'
     */
    ssr: string|string[]|undefined

    /**
     * The directory where the SSR bundle should be written.
     *
     * @default 'storage/ssr'
     */
    ssrOutputDirectory: string
}

interface LaravelPlugin extends Plugin {
    config: (config: UserConfig, env: ConfigEnv) => UserConfig
}

/**
 * Laravel plugin for Vite.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
export default function laravel(config?: string|string[]|Partial<PluginConfig>): LaravelPlugin {
    const pluginConfig = resolvePluginConfig(config)
    let viteDevServerUrl: string
    let resolvedConfig: ResolvedConfig

    const ziggy = 'vendor/tightenco/ziggy/dist/index.es.js';
    const defaultAliases: Record<string, string> = {
        ...(fs.existsSync(ziggy) ? { ziggy } : undefined),
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
                }
            }
        },
        configResolved(config) {
            resolvedConfig = config
        },
        transform(code) {
            if (resolvedConfig.command === 'serve') {
                return code.replace('__laravel_vite_placeholder__', viteDevServerUrl)
            }
        },
        configureServer(server) {
            const hotFile = path.join('public', 'hot')

            server.httpServer?.once('listening', () => {
                const address = server.httpServer?.address()

                const isAddressInfo = (x: string|AddressInfo|null|undefined): x is AddressInfo => typeof x === 'object'
                if (isAddressInfo(address)) {
                    const protocol = server.config.server.https ? 'https' : 'http'
                    const host = address.family === 'IPv6' ? `[${address.address}]` : address.address
                    viteDevServerUrl = `${protocol}://${host}:${address.port}`
                    fs.writeFileSync(hotFile, viteDevServerUrl)

                    const appUrl = loadEnv('', process.cwd(), 'APP_URL').APP_URL

                    setTimeout(() => {
                        server.config.logger.info(colors.red(`\n  Laravel ${laravelVersion()} `))
                        server.config.logger.info(`\n  > APP_URL: ` + colors.cyan(appUrl))
                    })
                }
            })

            const clean = () => {
                if (fs.existsSync(hotFile)) {
                    fs.rmSync(hotFile)
                }
                process.exit()
            }

            process.on('exit', clean)
            process.on('SIGHUP', clean)
            process.on('SIGINT', clean)
            process.on('SIGTERM', clean)
        }
    }
}

/**
 * The version of Laravel being run.
 */
function laravelVersion(): string {
    try {
        const composer = JSON.parse(fs.readFileSync('composer.lock').toString())

        return composer.packages?.find((composerPackage: {name: string}) => composerPackage.name === 'laravel/framework')?.version ?? ''
    } catch {
        return ''
    }
}

/**
 * Convert the users configuration into a standard structure with defaults.
 */
function resolvePluginConfig(config?: string|string[]|Partial<PluginConfig>): PluginConfig {
    if (typeof config === 'undefined' || typeof config === 'string' || Array.isArray(config)) {
        config = { input: config, ssr: config }
    }

    if (typeof config.publicDirectory === 'string') {
        config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, '')

        if (config.publicDirectory === '') {
            throw new Error('publicDirectory must be a subdirectory. E.g. \'public\'.')
        }
    }

    if (typeof config.buildDirectory === 'string') {
        config.buildDirectory = config.buildDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '')

        if (config.buildDirectory === '') {
            throw new Error('buildDirectory must be a subdirectory. E.g. \'build\'.')
        }
    }

    if (typeof config.ssrOutputDirectory === 'string') {
        config.ssrOutputDirectory = config.ssrOutputDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '')
    }

    return {
        input: config.input ?? 'resources/js/app.js',
        publicDirectory: config.publicDirectory ?? 'public',
        buildDirectory: config.buildDirectory ?? 'build',
        ssr: config.ssr ?? 'resources/js/ssr.js',
        ssrOutputDirectory: config.ssrOutputDirectory ?? 'storage/ssr',
    }
}

/**
 * Resolve the Vite base option from the configuration.
 */
function resolveBase(config: PluginConfig, assetUrl: string): string {
    return assetUrl + (! assetUrl.endsWith('/') ? '/' : '') + config.buildDirectory + '/'
}

/**
 * Resolve the Vite input path from the configuration.
 */
function resolveInput(config: PluginConfig, ssr: boolean): string|string[]|undefined {
    if (ssr) {
        return config.ssr ?? config.input
    }

    return config.input
}

/**
 * Resolve the Vite outDir path from the configuration.
 */
function resolveOutDir(config: PluginConfig, ssr: boolean): string|undefined {
    if (ssr) {
        return config.ssrOutputDirectory
    }

    return path.join(config.publicDirectory, config.buildDirectory)
}

import fs from 'fs'
import { AddressInfo } from 'net'
import { Server as TlsServer } from 'node:tls'
import path from 'path'
import colors from 'picocolors'
import { Plugin, loadEnv, ViteDevServer } from 'vite'

/**
 * Laravel plugin for Vite.
 *
 * @param entrypoints - Relative paths of the scripts to be compiled.
 */
export default function laravel(entrypoints: string|string[]): Plugin {
    if (typeof entrypoints === 'string') {
        entrypoints = [entrypoints];
    }
    entrypoints = entrypoints.map(entrypoint => entrypoint.replace(/^\/+/, ''))

    return {
        name: 'laravel',
        enforce: 'post',
        config: (_, { command }) => ({
            base: command === 'build' ? '/build/' : '',
            publicDir: false,
            build: {
                manifest: true,
                outDir: path.join('public', 'build'),
                rollupOptions: {
                    input: entrypoints,
                },
            },
        }),
        configureServer,
    }
}

/**
 * Standalone plugin to configure the hot server for Laravel.
 */
export function configureLaravelHotServer(): Plugin {
    return {
        name: 'laravel:hot-server',
        configureServer,
    }
}

/**
 * Vite hook for configuring the dev server.
 */
function configureServer(server: ViteDevServer) {
    const hotFile = path.join('public', 'hot')

    server.httpServer?.once('listening', () => {
        const protocol = server.httpServer instanceof TlsServer ? 'https' : 'http'
        const { address, port } = server.httpServer?.address() as AddressInfo

        fs.writeFileSync(hotFile, `${protocol}://${address}:${port}`)

        const appUrl = loadEnv('', process.cwd(), 'APP_URL').APP_URL

        setTimeout(() => {
            server.config.logger.info(colors.red(`\n  Laravel ${laravelVersion()} `))
            server.config.logger.info(`\n  > APP_URL: ` + colors.cyan(appUrl))
        })
    })

    process.on('SIGINT', () => {
        fs.rmSync(hotFile)
        process.exit()
    })
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

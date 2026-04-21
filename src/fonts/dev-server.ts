import fs from 'fs'
import { FORMAT_MIME } from './types.js'
import { cacheKey } from './cache.js'
import type { IncomingMessage, ServerResponse } from 'http'
import type { FontFormat, ResolvedFontFamily } from './types.js'

const FONT_ROUTE_PREFIX = '/__laravel_vite_plugin__/fonts'

export function buildDevUrlMap(
    families: ResolvedFontFamily[],
    devServerUrl: string,
): Map<string, string> {
    const urlMap = new Map<string, string>()

    for (const family of families) {
        for (const variant of family.variants) {
            for (const file of variant.files) {
                if (! urlMap.has(file.source)) {
                    const hash = cacheKey(file.source)
                    const ext = file.format === 'woff2' ? '.woff2' : `.${file.format}`
                    urlMap.set(file.source, `${devServerUrl}${FONT_ROUTE_PREFIX}/${hash}${ext}`)
                }
            }
        }
    }

    return urlMap
}

export function createFontMiddleware(): {
    middleware: (req: IncomingMessage, res: ServerResponse, next: () => void) => void,
    update: (families: ResolvedFontFamily[]) => void,
} {
    let lookup = new Map<string, { source: string, format: FontFormat }>()

    function update(families: ResolvedFontFamily[]): void {
        const newLookup = new Map<string, { source: string, format: FontFormat }>()

        for (const family of families) {
            for (const variant of family.variants) {
                for (const file of variant.files) {
                    const hash = cacheKey(file.source)
                    newLookup.set(hash, { source: file.source, format: file.format })
                }
            }
        }

        lookup = newLookup
    }

    function middleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
        if (! req.url?.startsWith(FONT_ROUTE_PREFIX + '/')) {
            return next()
        }

        const fileName = req.url.slice(FONT_ROUTE_PREFIX.length + 1)
        const hash = fileName.replace(/\.[^.]+$/, '')
        const entry = lookup.get(hash)

        if (! entry) {
            res.statusCode = 404
            res.end('Font not found')

            return
        }

        if (! fs.existsSync(entry.source)) {
            res.statusCode = 404
            res.end('Font file not found on disk')

            return
        }

        const mime = FORMAT_MIME[entry.format] ?? 'application/octet-stream'

        res.setHeader('Content-Type', mime)
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'no-store')

        const stream = fs.createReadStream(entry.source)

        stream.on('error', (err) => {
            if (! res.headersSent) {
                res.statusCode = 500
            }
            res.destroy(err)
        })

        res.on('close', () => {
            stream.destroy()
        })

        stream.pipe(res)
    }

    return { middleware, update }
}

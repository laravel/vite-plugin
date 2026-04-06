import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'

const DEFAULT_CACHE_DIR = 'node_modules/.cache/laravel-vite-plugin/fonts'

export function resolveCacheDir(projectRoot: string, cacheDir?: string): string {
    const dir = cacheDir ?? path.resolve(projectRoot, DEFAULT_CACHE_DIR)

    if (! fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    return dir
}

export function cacheKey(input: string): string {
    return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

export function readCache(cacheDir: string, key: string): Buffer|undefined {
    const filePath = path.join(cacheDir, key)

    return fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined
}

export function readCacheText(cacheDir: string, key: string): string|undefined {
    const data = readCache(cacheDir, key)

    return data?.toString('utf-8')
}

export function writeCache(cacheDir: string, key: string, data: Buffer|string): void {
    const filePath = path.join(cacheDir, key)
    fs.writeFileSync(filePath, data)
}

export async function fetchAndCache(
    url: string,
    cacheDir: string,
    headers?: Record<string, string>,
): Promise<Buffer> {
    const key = cacheKey(url)
    const cached = readCache(cacheDir, key)

    if (cached) {
        return cached
    }

    const response = await fetch(url, { headers })

    if (! response.ok) {
        throw new Error(
            `laravel-vite-plugin: Failed to fetch "${url}": ${response.status} ${response.statusText}`
        )
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    writeCache(cacheDir, key, buffer)

    return buffer
}

export async function fetchTextAndCache(
    url: string,
    cacheDir: string,
    headers?: Record<string, string>,
): Promise<string> {
    const key = cacheKey(url + ':text')
    const cached = readCacheText(cacheDir, key)

    if (cached) {
        return cached
    }

    const response = await fetch(url, { headers })

    if (! response.ok) {
        throw new Error(
            `laravel-vite-plugin: Failed to fetch "${url}": ${response.status} ${response.statusText}`
        )
    }

    const text = await response.text()
    writeCache(cacheDir, key, text)

    return text
}

import { describe, expect, it, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { resolveCacheDir, cacheKey, readCache, readCacheText, writeCache } from '../src/fonts/cache'

describe('fonts cache', () => {
    let tmpDir: string

    afterEach(() => {
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true })
        }
    })

    function makeTmpDir(): string {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laravel-vite-fonts-test-'))
        return tmpDir
    }

    describe('resolveCacheDir', () => {
        it('creates the cache directory if it does not exist', () => {
            const dir = makeTmpDir()
            const cacheDir = path.join(dir, 'cache', 'fonts')

            const result = resolveCacheDir(dir, cacheDir)

            expect(result).toBe(cacheDir)
            expect(fs.existsSync(cacheDir)).toBe(true)
        })

        it('uses the default path when no custom dir is provided', () => {
            const dir = makeTmpDir()
            const result = resolveCacheDir(dir)

            expect(result).toContain('node_modules/.cache/laravel-vite-plugin/fonts')
        })
    })

    describe('cacheKey', () => {
        it('returns a deterministic hash', () => {
            const key1 = cacheKey('https://example.com/font.woff2')
            const key2 = cacheKey('https://example.com/font.woff2')

            expect(key1).toBe(key2)
            expect(key1).toHaveLength(16)
        })

        it('returns different hashes for different inputs', () => {
            const key1 = cacheKey('https://example.com/font1.woff2')
            const key2 = cacheKey('https://example.com/font2.woff2')

            expect(key1).not.toBe(key2)
        })
    })

    describe('readCache / writeCache', () => {
        it('returns undefined when file is not cached', () => {
            const dir = makeTmpDir()
            expect(readCache(dir, 'nonexistent')).toBeUndefined()
        })

        it('writes and reads binary data', () => {
            const dir = makeTmpDir()
            const data = Buffer.from('hello binary world')

            writeCache(dir, 'test-key', data)
            const result = readCache(dir, 'test-key')

            expect(result).toEqual(data)
        })

        it('writes and reads text data', () => {
            const dir = makeTmpDir()
            const text = '@font-face { font-family: "Test"; }'

            writeCache(dir, 'test-css', text)
            const result = readCacheText(dir, 'test-css')

            expect(result).toBe(text)
        })

        it('returns undefined for readCacheText when not cached', () => {
            const dir = makeTmpDir()
            expect(readCacheText(dir, 'missing')).toBeUndefined()
        })
    })
})

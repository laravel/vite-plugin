import { EventEmitter } from 'events'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PassThrough, Readable } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDevUrlMap, createFontMiddleware } from '../src/fonts/dev-server'
import { resolveFontsPlugin } from '../src/fonts/plugin'
import { google } from '../src/fonts/providers/providers'
import type { ResolvedFontFamily } from '../src/fonts/types'

function makeFamily(overrides?: Partial<ResolvedFontFamily>): ResolvedFontFamily {
    return {
        family: 'Inter',
        alias: 'inter',
        variable: '--font-inter',
        display: 'swap',
        optimizedFallbacks: true,
        fallbacks: [],
        preload: true,
        provider: 'local',
        variants: [{
            weight: 400,
            style: 'normal',
            files: [{
                source: '/fonts/inter-400.woff2',
                format: 'woff2',
            }],
        }],
        ...overrides,
    }
}

describe('fonts dev server', () => {
    describe('buildDevUrlMap', () => {
        it('builds URLs with the correct prefix', () => {
            const families = [makeFamily()]
            const urlMap = buildDevUrlMap(families, 'http://localhost:5173')

            const url = urlMap.get('/fonts/inter-400.woff2')
            expect(url).toContain('http://localhost:5173/__laravel_vite_plugin__/fonts/')
            expect(url).toContain('.woff2')
        })

        it('deduplicates same source across variants', () => {
            const families = [makeFamily({
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter.woff2', format: 'woff2' }] },
                ],
            })]

            const urlMap = buildDevUrlMap(families, 'http://localhost:5173')
            expect(urlMap.size).toBe(1)
        })

        it('maps different sources to different URLs', () => {
            const families = [makeFamily({
                variants: [
                    { weight: 400, style: 'normal', files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }] },
                    { weight: 700, style: 'normal', files: [{ source: '/fonts/inter-700.woff2', format: 'woff2' }] },
                ],
            })]

            const urlMap = buildDevUrlMap(families, 'http://localhost:5173')
            expect(urlMap.size).toBe(2)

            const urls = [...urlMap.values()]
            expect(urls[0]).not.toBe(urls[1])
        })
    })

    describe('createFontMiddleware', () => {
        function mockReqRes(url: string) {
            const req = { url }
            const headers: Record<string, string> = {}
            const res = {
                statusCode: 200,
                end: () => {},
                setHeader: (key: string, value: string) => { headers[key] = value },
                __headers: headers,
            }
            return { req, res }
        }

        it('passes through non-font requests', () => {
            const { middleware, update } = createFontMiddleware()
            update([makeFamily()])
            const { req, res } = mockReqRes('/index.html')
            let nextCalled = false

            middleware(req, res, () => { nextCalled = true })

            expect(nextCalled).toBe(true)
        })

        it('returns 404 for unknown font hash', () => {
            const { middleware, update } = createFontMiddleware()
            update([makeFamily()])
            const { req, res } = mockReqRes('/__laravel_vite_plugin__/fonts/unknown-hash.woff2')
            let nextCalled = false

            middleware(req, res, () => { nextCalled = true })

            expect(res.statusCode).toBe(404)
            expect(nextCalled).toBe(false)
        })
    })

    describe('createFontMiddleware streaming', () => {
        let tmpDir: string
        let fontSource: string
        let fontHash: string
        let urlPath: string

        function makeTmpFamily(): ResolvedFontFamily {
            return makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [{ source: fontSource, format: 'woff2' }],
                }],
            })
        }

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-dev-test-'))
            fontSource = path.join(tmpDir, 'inter-400.woff2')
            fs.writeFileSync(fontSource, Buffer.from('woff2-bytes'))

            const urlMap = buildDevUrlMap([makeTmpFamily()], 'http://localhost:5173')
            const url = urlMap.get(fontSource)!
            urlPath = url.slice('http://localhost:5173'.length)
            fontHash = urlPath.split('/').pop()!.replace(/\.[^.]+$/, '')
            expect(fontHash).toBeTruthy()
        })

        afterEach(() => {
            vi.restoreAllMocks()
            fs.rmSync(tmpDir, { recursive: true, force: true })
        })

        function makeStreamRes(): PassThrough & { statusCode: number, setHeader: (k: string, v: string) => void, __headers: Record<string, string>, headersSent: boolean } {
            const res = new PassThrough() as PassThrough & {
                statusCode: number
                setHeader: (k: string, v: string) => void
                __headers: Record<string, string>
                headersSent: boolean
            }
            res.statusCode = 200
            res.__headers = {}
            res.headersSent = false
            res.setHeader = (k: string, v: string) => { res.__headers[k] = v }

            return res
        }

        it('streams the font file bytes via createReadStream', async () => {
            const createReadStreamSpy = vi.spyOn(fs, 'createReadStream')
            const readFileSyncSpy = vi.spyOn(fs, 'readFileSync')

            const { middleware, update } = createFontMiddleware()
            update([makeTmpFamily()])

            const req = { url: urlPath }
            const res = makeStreamRes()

            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))

            const done = new Promise<void>((resolve) => res.on('end', () => resolve()))

            middleware(req, res, () => {})

            await done

            expect(createReadStreamSpy).toHaveBeenCalledTimes(1)
            expect(createReadStreamSpy.mock.calls[0][0]).toBe(fontSource)
            expect(readFileSyncSpy).not.toHaveBeenCalled()
            expect(res.statusCode).toBe(200)
            expect(Buffer.concat(chunks).toString()).toBe('woff2-bytes')
        })

        it('returns 404 for missing disk file without opening a stream', () => {
            fs.rmSync(fontSource)

            const createReadStreamSpy = vi.spyOn(fs, 'createReadStream')

            const { middleware, update } = createFontMiddleware()
            update([makeTmpFamily()])

            const req = { url: urlPath }
            const res = makeStreamRes()

            middleware(req, res, () => {})

            expect(res.statusCode).toBe(404)
            expect(createReadStreamSpy).not.toHaveBeenCalled()
        })

        it('responds with 500 and destroys the response when the stream errors before headers', async () => {
            const errorStream = new Readable({ read() {} })

            vi.spyOn(fs, 'createReadStream').mockReturnValue(errorStream as unknown as fs.ReadStream)

            const { middleware, update } = createFontMiddleware()
            update([makeTmpFamily()])

            const req = { url: urlPath }
            const res = makeStreamRes()
            res.on('data', () => {})
            res.on('error', () => {})

            const closed = new Promise<void>((resolve) => res.on('close', () => resolve()))

            middleware(req, res, () => {})

            errorStream.emit('error', new Error('disk boom'))

            await closed

            expect(res.statusCode).toBe(500)
            expect(res.destroyed).toBe(true)
        })

        it('destroys the response without marking 200 when the stream errors mid-transfer', async () => {
            const errorStream = new Readable({ read() {} })

            vi.spyOn(fs, 'createReadStream').mockReturnValue(errorStream as unknown as fs.ReadStream)

            const { middleware, update } = createFontMiddleware()
            update([makeTmpFamily()])

            const req = { url: urlPath }
            const res = makeStreamRes()
            res.headersSent = true
            res.statusCode = 200
            res.on('data', () => {})
            res.on('error', () => {})

            const closed = new Promise<void>((resolve) => res.on('close', () => resolve()))
            const finished = vi.fn()
            res.on('finish', finished)

            middleware(req, res, () => {})

            errorStream.emit('error', new Error('mid-transfer boom'))

            await closed

            expect(res.destroyed).toBe(true)
            expect(finished).not.toHaveBeenCalled()
        })

        it('destroys the source stream when the client disconnects mid-transfer', () => {
            const sourceStream = new Readable({ read() {} }) as Readable & { destroyed: boolean }
            const destroySpy = vi.spyOn(sourceStream, 'destroy')

            vi.spyOn(fs, 'createReadStream').mockReturnValue(sourceStream as unknown as fs.ReadStream)

            const { middleware, update } = createFontMiddleware()
            update([makeTmpFamily()])

            const req = { url: urlPath }
            const res = makeStreamRes()
            res.on('error', () => {})

            middleware(req, res, () => {})

            res.emit('close')

            expect(destroySpy).toHaveBeenCalled()
        })
    })

    describe('createFontMiddleware cache headers', () => {
        let tmpDir: string
        const sources: string[] = []

        function makeTmpFamily(source: string, format: 'woff2' | 'ttf' | 'otf'): ResolvedFontFamily {
            return makeFamily({
                variants: [{
                    weight: 400,
                    style: 'normal',
                    files: [{ source, format }],
                }],
            })
        }

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-dev-cache-'))
            sources.length = 0
        })

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        })

        function makeStreamRes(): PassThrough & { statusCode: number, setHeader: (k: string, v: string) => void, __headers: Record<string, string> } {
            const res = new PassThrough() as PassThrough & {
                statusCode: number
                setHeader: (k: string, v: string) => void
                __headers: Record<string, string>
            }
            res.statusCode = 200
            res.__headers = {}
            res.setHeader = (k: string, v: string) => { res.__headers[k] = v }

            return res
        }

        it.each([
            ['woff2', 'inter-400.woff2'],
            ['ttf', 'inter-400.ttf'],
            ['otf', 'inter-400.otf'],
        ] as const)('sends a dev cache-control header for %s', async (format, filename) => {
            const source = path.join(tmpDir, filename)
            fs.writeFileSync(source, Buffer.from('bytes'))
            sources.push(source)

            const family = makeTmpFamily(source, format)
            const urlMap = buildDevUrlMap([family], 'http://localhost:5173')
            const url = urlMap.get(source)!
            const urlPath = url.slice('http://localhost:5173'.length)

            const { middleware, update } = createFontMiddleware()
            update([family])

            const req = { url: urlPath }
            const res = makeStreamRes()
            res.on('data', () => {})
            res.on('error', () => {})

            const done = new Promise<void>((resolve) => res.on('end', () => resolve()))

            middleware(req, res, () => {})

            await done

            const cacheControl = res.__headers['Cache-Control']
            expect(cacheControl).toBeDefined()
            expect(cacheControl.toLowerCase()).not.toContain('immutable')
            expect(cacheControl.toLowerCase()).toMatch(/no-store|no-cache|max-age=\d{1,3}(?!\d)/)
        })
    })
})

describe('fonts plugin hot-manifest cleanup', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-hot-cleanup-'))
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    type FakeServer = {
        config: {
            root: string
            command: 'serve' | 'build'
            server: { port: number }
            logger: { error: (m: string) => void }
        }
        middlewares: { use: (m: unknown) => void }
        httpServer: EventEmitter | null
    }

    function setupPlugin(hotFile: string): {
        plugin: ReturnType<typeof resolveFontsPlugin>[number]
        hotManifestPath: string
        server: FakeServer
    } {
        const [plugin] = resolveFontsPlugin([google('Inter')], hotFile, 'build')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(plugin.configResolved as any)({ root: tmpDir, command: 'serve' })

        const hotManifestPath = path.resolve(path.dirname(hotFile), 'fonts-manifest.dev.json')

        const server: FakeServer = {
            config: {
                root: tmpDir,
                command: 'serve',
                server: { port: 5173 },
                logger: { error: () => {} },
            },
            middlewares: { use: () => {} },
            httpServer: new EventEmitter(),
        }

        return { plugin, hotManifestPath, server }
    }

    function captureExitListener(register: () => void): (...args: unknown[]) => void {
        const captured: Array<(...args: unknown[]) => void> = []
        const originalOn = process.on.bind(process)
        const spy = vi.spyOn(process, 'on').mockImplementation(((event: string | symbol, listener: (...args: unknown[]) => void) => {
            if (event === 'exit') {
                captured.push(listener)
            }
            return originalOn(event as 'exit', listener as never)
        }) as typeof process.on)

        try {
            register()
        } finally {
            spy.mockRestore()
        }

        if (captured.length !== 1) {
            throw new Error(`Expected exactly one exit listener to be registered, got ${captured.length}`)
        }

        return captured[0]
    }

    it('removes this server\'s hot manifest when its httpServer closes', () => {
        const hotFile = path.join(tmpDir, 'hot')
        const { plugin, hotManifestPath, server } = setupPlugin(hotFile)

        fs.writeFileSync(hotManifestPath, '{}')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(plugin.configureServer as any)(server)

        server.httpServer!.emit('close')

        expect(fs.existsSync(hotManifestPath)).toBe(false)
    })

    it('closing one server leaves the other server\'s hot manifest untouched', () => {
        const hotFileA = path.join(tmpDir, 'a', 'hot')
        const hotFileB = path.join(tmpDir, 'b', 'hot')
        fs.mkdirSync(path.dirname(hotFileA), { recursive: true })
        fs.mkdirSync(path.dirname(hotFileB), { recursive: true })

        const a = setupPlugin(hotFileA)
        const b = setupPlugin(hotFileB)

        fs.writeFileSync(a.hotManifestPath, '{}')
        fs.writeFileSync(b.hotManifestPath, '{}')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(a.plugin.configureServer as any)(a.server)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(b.plugin.configureServer as any)(b.server)

        a.server.httpServer!.emit('close')

        expect(fs.existsSync(a.hotManifestPath)).toBe(false)
        expect(fs.existsSync(b.hotManifestPath)).toBe(true)

        b.server.httpServer!.emit('close')
    })

    it('registers an exit-cleanup listener in middleware mode and removes the hot manifest on exit', () => {
        const hotFile = path.join(tmpDir, 'hot')
        const { plugin, hotManifestPath, server } = setupPlugin(hotFile)

        server.httpServer = null

        fs.writeFileSync(hotManifestPath, '{}')

        const before = process.listenerCount('exit')

        const onExit = captureExitListener(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(plugin.configureServer as any)(server)
        })

        expect(process.listenerCount('exit')).toBe(before + 1)

        onExit()

        expect(fs.existsSync(hotManifestPath)).toBe(false)

        process.removeListener('exit', onExit)
    })

    it('middleware-mode exit cleanup is idempotent when the manifest is already gone', () => {
        const hotFile = path.join(tmpDir, 'hot')
        const { plugin, hotManifestPath, server } = setupPlugin(hotFile)

        server.httpServer = null

        fs.writeFileSync(hotManifestPath, '{}')

        const onExit = captureExitListener(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(plugin.configureServer as any)(server)
        })

        expect(() => {
            onExit()
            onExit()
        }).not.toThrow()
        expect(fs.existsSync(hotManifestPath)).toBe(false)

        process.removeListener('exit', onExit)
    })

    it('middleware-mode exit cleanup is scoped to each plugin instance', () => {
        const hotFileA = path.join(tmpDir, 'a', 'hot')
        const hotFileB = path.join(tmpDir, 'b', 'hot')
        fs.mkdirSync(path.dirname(hotFileA), { recursive: true })
        fs.mkdirSync(path.dirname(hotFileB), { recursive: true })

        const a = setupPlugin(hotFileA)
        const b = setupPlugin(hotFileB)

        a.server.httpServer = null
        b.server.httpServer = null

        fs.writeFileSync(a.hotManifestPath, '{}')
        fs.writeFileSync(b.hotManifestPath, '{}')

        const aListener = captureExitListener(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(a.plugin.configureServer as any)(a.server)
        })
        const bListener = captureExitListener(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(b.plugin.configureServer as any)(b.server)
        })

        aListener()

        expect(fs.existsSync(a.hotManifestPath)).toBe(false)
        expect(fs.existsSync(b.hotManifestPath)).toBe(true)

        bListener()

        expect(fs.existsSync(b.hotManifestPath)).toBe(false)

        process.removeListener('exit', aListener)
        process.removeListener('exit', bListener)
    })

    it('does not leak an exit listener when httpServer is present and closes normally', () => {
        const hotFile = path.join(tmpDir, 'hot')
        const { plugin, hotManifestPath, server } = setupPlugin(hotFile)

        fs.writeFileSync(hotManifestPath, '{}')

        const baseline = process.listenerCount('exit')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(plugin.configureServer as any)(server)

        server.httpServer!.emit('close')

        expect(fs.existsSync(hotManifestPath)).toBe(false)
        expect(process.listenerCount('exit')).toBe(baseline)
    })
})

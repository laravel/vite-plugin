import { describe, expect, it } from 'vitest'
import { buildDevUrlMap, createFontMiddleware } from '../src/fonts/dev-server'
import type { ResolvedFontFamily } from '../src/fonts/types'

function makeFamily(overrides?: Partial<ResolvedFontFamily>): ResolvedFontFamily {
    return {
        family: 'Inter',
        variable: '--font-inter',
        display: 'swap',
        fallback: true,
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
            const middleware = createFontMiddleware([makeFamily()])
            const { req, res } = mockReqRes('/index.html')
            let nextCalled = false

            middleware(req, res, () => { nextCalled = true })

            expect(nextCalled).toBe(true)
        })

        it('returns 404 for unknown font hash', () => {
            const middleware = createFontMiddleware([makeFamily()])
            const { req, res } = mockReqRes('/__laravel_vite_plugin__/fonts/unknown-hash.woff2')
            let nextCalled = false

            middleware(req, res, () => { nextCalled = true })

            expect(res.statusCode).toBe(404)
            expect(nextCalled).toBe(false)
        })
    })
})

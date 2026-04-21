import { describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { assertFileRefsResolved, resolveFontsPlugin } from '../src/fonts/plugin'
import { local } from '../src/fonts/providers/providers'
import type { FontDefinition, ResolvedFontFamily } from '../src/fonts/types'

const FIXTURE_FONT = path.resolve(__dirname, 'fixtures/fonts/test-font.woff2')
const FIXTURE_FONT_2 = path.resolve(__dirname, 'fixtures/fonts/test-font-2.woff2')

type EmittedAsset = {
    type: 'asset'
    fileName: string
    name?: string
    source: string | Buffer
}

type Bundle = Record<string, EmittedAsset>

type MockContext = {
    refs: Map<string, string>
    counter: number
    bundle: Bundle
    emitFile: (opts: { type: 'asset', name?: string, fileName?: string, source: string | Buffer }) => string
    getFileName: (ref: string) => string
}

function createMockContext(): MockContext {
    const refs = new Map<string, string>()
    const bundle: Bundle = {}
    let counter = 0

    const emitFile: MockContext['emitFile'] = (opts) => {
        const ref = `ref-${++counter}`
        const fileName = opts.fileName ?? buildAssetFileName(opts.name!)
        refs.set(ref, fileName)
        bundle[fileName] = {
            type: 'asset',
            fileName,
            name: opts.name,
            source: opts.source,
        }
        return ref
    }

    const getFileName = (ref: string): string => {
        const name = refs.get(ref)

        if (! name) {
            throw new Error(`No filename registered for ref ${ref}`)
        }

        return name
    }

    return { refs, counter, bundle, emitFile, getFileName }
}

function buildAssetFileName(name: string): string {
    const ext = path.extname(name)
    const base = name.slice(0, -ext.length)

    return `assets/${base}-abc123${ext}`
}

async function runBuild(
    fonts: FontDefinition[],
    tmpRoot: string,
): Promise<{ ctx: MockContext, plugin: ReturnType<typeof resolveFontsPlugin>[number] }> {
    const hotFile = path.join(tmpRoot, 'hot')
    const [plugin] = resolveFontsPlugin(fonts, hotFile, 'build')

    const ctx = createMockContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(plugin.configResolved as any).call(ctx, { root: tmpRoot, command: 'build' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (plugin.buildStart as any).call(ctx)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (plugin.generateBundle as any).call(ctx, {}, ctx.bundle)

    return { ctx, plugin }
}

function findCssAsset(bundle: Bundle): EmittedAsset {
    const entry = Object.values(bundle).find(a => a.fileName.endsWith('.css'))

    if (! entry) {
        throw new Error(`No CSS asset in bundle. Got: ${Object.keys(bundle).join(', ')}`)
    }

    return entry
}

function findManifestAsset(bundle: Bundle): EmittedAsset {
    const entry = Object.values(bundle).find(a => a.fileName === 'fonts-manifest.json')

    if (! entry) {
        throw new Error(`No manifest asset in bundle. Got: ${Object.keys(bundle).join(', ')}`)
    }

    return entry
}

describe('fonts plugin single-pass build', () => {
    it('emits CSS with final hashed asset URLs and no placeholder tokens', async () => {
        const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-build-happy-'))
        try {
            const fontsConfig = [local('Test', {
                optimizedFallbacks: false,
                variants: [{ src: FIXTURE_FONT, weight: 400, style: 'normal' }],
            })]

            const { ctx } = await runBuild(fontsConfig, tmpRoot)

            const cssAsset = findCssAsset(ctx.bundle)
            const manifestAsset = findManifestAsset(ctx.bundle)

            const cssText = String(cssAsset.source)
            const manifestText = String(manifestAsset.source)

            expect(cssText).not.toContain('__FONT_REF_')
            expect(cssText).toMatch(/url\("\/build\/assets\/test-[^"]*\.woff2"\)/)

            expect(manifestText).not.toContain('__FONT_REF_')
        } finally {
            fs.rmSync(tmpRoot, { recursive: true, force: true })
        }
    })

    it('gives distinct hashed URLs to each of multiple families that share a fallback keyword', async () => {
        const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-build-multi-'))
        try {
            const fontsConfig = [
                local('Alpha', {
                    fallbacks: ['sans-serif'],
                    optimizedFallbacks: false,
                    variants: [{ src: FIXTURE_FONT, weight: 400, style: 'normal' }],
                }),
                local('Beta', {
                    fallbacks: ['sans-serif'],
                    optimizedFallbacks: false,
                    variants: [{ src: FIXTURE_FONT_2, weight: 400, style: 'normal' }],
                }),
            ]

            const { ctx } = await runBuild(fontsConfig, tmpRoot)

            const cssText = String(findCssAsset(ctx.bundle).source)

            const urls = Array.from(cssText.matchAll(/url\("(\/build\/assets\/[^"]+\.woff2)"\)/g)).map(m => m[1])

            expect(urls.length).toBeGreaterThanOrEqual(2)
            expect(new Set(urls).size).toBe(urls.length)
            expect(urls.some(u => u.includes('alpha'))).toBe(true)
            expect(urls.some(u => u.includes('beta'))).toBe(true)
        } finally {
            fs.rmSync(tmpRoot, { recursive: true, force: true })
        }
    })
})

describe('assertFileRefsResolved', () => {
    function makeFamily(overrides?: Partial<ResolvedFontFamily>): ResolvedFontFamily {
        return {
            family: 'Inter',
            alias: 'inter',
            variable: '--font-inter',
            display: 'swap',
            optimizedFallbacks: false,
            fallbacks: [],
            preload: true,
            provider: 'local',
            variants: [{
                weight: 400,
                style: 'normal',
                files: [{ source: '/fonts/inter-400.woff2', format: 'woff2' }],
            }],
            ...overrides,
        }
    }

    it('throws a clear laravel-vite-plugin error naming the family when a source is missing', () => {
        const family = makeFamily({ family: 'Inter' })
        const emptyMap = new Map<string, string>()

        expect(() => assertFileRefsResolved([family], emptyMap)).toThrow(
            /laravel-vite-plugin.*Inter/,
        )
    })

    it('does not throw when every source is present in the ref map', () => {
        const family = makeFamily()
        const refMap = new Map([['/fonts/inter-400.woff2', 'ref-1']])

        expect(() => assertFileRefsResolved([family], refMap)).not.toThrow()
    })

    it('reports the first missing family, not just a generic error', () => {
        const first = makeFamily({ family: 'Inter', alias: 'inter' })
        const second = makeFamily({
            family: 'Roboto',
            alias: 'roboto',
            variable: '--font-roboto',
            variants: [{
                weight: 400,
                style: 'normal',
                files: [{ source: '/fonts/roboto-400.woff2', format: 'woff2' }],
            }],
        })

        const partialMap = new Map([['/fonts/inter-400.woff2', 'ref-1']])

        expect(() => assertFileRefsResolved([first, second], partialMap)).toThrow(/Roboto/)
    })
})

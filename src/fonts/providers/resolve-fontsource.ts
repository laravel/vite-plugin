import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { parseFontFaceCss } from '../css-parser.js'
import { familyToVariable, familyToSlug } from '../config.js'
import type { FontConfig, FontsourceProviderConfig, ResolvedFontFamily, ResolvedFontFile, ResolvedFontVariant, FontStyle } from '../types.js'

export function resolveFontsourceFont(
    config: FontConfig,
    projectRoot: string,
): ResolvedFontFamily {
    const provider = config.provider as FontsourceProviderConfig
    const packageName = provider.package ?? `@fontsource/${familyToSlug(config.family)}`

    let packageDir: string
    try {
        const require = createRequire(path.join(projectRoot, 'package.json'))
        packageDir = path.dirname(
            require.resolve(`${packageName}/package.json`)
        )
    } catch {
        throw new Error(
            `laravel-vite-plugin: Fontsource package "${packageName}" not found. ` +
            `Install it with: npm install ${packageName}`
        )
    }

    const weights = config.weights ?? [400]
    const styles = config.styles ?? ['normal']
    const subsets = config.subsets ?? ['latin']
    const variants: ResolvedFontVariant[] = []

    for (const weight of weights) {
        for (const style of styles) {
            for (const subset of subsets) {
                const cssFileName = style === 'italic'
                    ? `${subset}-${weight}-italic.css`
                    : `${subset}-${weight}.css`
                const cssFilePath = path.join(packageDir, cssFileName)

                if (! fs.existsSync(cssFilePath)) {
                    throw new Error(
                        `laravel-vite-plugin: Fontsource CSS file not found: "${cssFileName}" ` +
                        `in package "${packageName}" for font "${config.family}". ` +
                        `Check that weight ${weight}, style "${style}", and subset "${subset}" are available.`
                    )
                }

                const cssContent = fs.readFileSync(cssFilePath, 'utf-8')
                const faces = parseFontFaceCss(cssContent)

                for (const face of faces) {
                    const files: ResolvedFontFile[] = []

                    for (const src of face.src) {
                        const absolutePath = path.resolve(path.dirname(cssFilePath), src.url)

                        if (! fs.existsSync(absolutePath)) {
                            throw new Error(
                                `laravel-vite-plugin: Font file referenced by Fontsource not found: "${absolutePath}" ` +
                                `for font "${config.family}".`
                            )
                        }

                        files.push({
                            source: absolutePath,
                            format: src.format,
                            unicodeRange: face.unicodeRange,
                        })
                    }

                    variants.push({
                        weight: face.weight,
                        style: face.style as FontStyle,
                        files,
                    })
                }
            }
        }
    }

    if (variants.length === 0) {
        throw new Error(
            `laravel-vite-plugin: No font variants resolved from Fontsource package "${packageName}" ` +
            `for font "${config.family}".`
        )
    }

    return {
        family: config.family,
        variable: config.variable ?? familyToVariable(config.family),
        tailwind: config.tailwind,
        display: config.display ?? 'swap',
        fallback: config.fallback ?? true,
        provider: 'fontsource',
        variants,
    }
}

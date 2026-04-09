import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { parseFontFaceCss } from '../css-parser.js'
import { familyToSlug, buildResolvedFamily } from '../config.js'
import type { FontDefinition, ResolvedFontFamily, ResolvedFontFile, ResolvedFontVariant, FontStyle } from '../types.js'

export function resolveFontsourceVariants(
    definition: FontDefinition,
    projectRoot: string,
): ResolvedFontVariant[] {
    const packageName = definition._fontsource?.package ?? `@fontsource/${familyToSlug(definition.family)}`

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

    const weights = definition.weights
    const styles = definition.styles
    const subsets = definition.subsets
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
                        `in package "${packageName}" for font "${definition.family}". ` +
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
                                `for font "${definition.family}".`
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
            `for font "${definition.family}".`
        )
    }

    return variants
}

export function resolveFontsourceFont(
    definition: FontDefinition,
    projectRoot: string,
): ResolvedFontFamily {
    return buildResolvedFamily(definition, resolveFontsourceVariants(definition, projectRoot))
}

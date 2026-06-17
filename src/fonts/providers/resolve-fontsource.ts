import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { parseFontFaceCss } from '../css-parser.js'
import { familyToSlug, buildResolvedFamily } from '../config.js'
import type { FontDefinition, ResolvedFontFamily, ResolvedFontFile, ResolvedFontVariant, FontStyle, ParsedFontFace } from '../types.js'

type FontsourceCssFile = {
    fileName: string
    filePath: string
    weight: string
    style: FontStyle
}

function buildCssFilePaths(definition: FontDefinition, packageDir: string, packageName: string): FontsourceCssFile[] {
    const paths: FontsourceCssFile[] = []

    for (const weight of definition.weights) {
        for (const style of definition.styles) {
            const cssFileName = style === 'italic'
                ? `${weight}-italic.css`
                : `${weight}.css`
            const cssFilePath = path.join(packageDir, cssFileName)

            if (! fs.existsSync(cssFilePath)) {
                throw new Error(
                    `laravel-vite-plugin: Fontsource CSS file not found: "${cssFileName}" ` +
                    `in package "${packageName}" for font "${definition.family}". ` +
                    `Check that weight ${weight} and style "${style}" are available.`
                )
            }

            paths.push({ fileName: cssFileName, filePath: cssFilePath, weight: String(weight), style })
        }
    }

    return paths
}

function matchesFontsourceSubset(face: ParsedFontFace, subset: string): boolean {
    const suffix = `-${subset}-${String(face.weight)}-${face.style}`

    return face.src.some(src => {
        const stem = path.basename(src.url).replace(/\.(?:woff2?|ttf|otf|eot)$/i, '')

        return stem.endsWith(suffix)
    })
}

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

    const variants: ResolvedFontVariant[] = []
    const cssFilePaths = buildCssFilePaths(definition, packageDir, packageName)

    for (const cssFile of cssFilePaths) {
        const faces = parseFontFaceCss(fs.readFileSync(cssFile.filePath, 'utf-8'))
        const matchedSubsets = new Set<string>()

        for (const face of faces) {
            const subset = definition.subsets.find(subset => matchesFontsourceSubset(face, subset))

            if (! subset) {
                continue
            }

            matchedSubsets.add(subset)

            const files: ResolvedFontFile[] = face.src.map(src => {
                const absolutePath = path.resolve(path.dirname(cssFile.filePath), src.url)

                if (! fs.existsSync(absolutePath)) {
                    throw new Error(
                        `laravel-vite-plugin: Font file referenced by Fontsource not found: "${absolutePath}" ` +
                        `for font "${definition.family}".`
                    )
                }

                return { source: absolutePath, format: src.format, unicodeRange: face.unicodeRange }
            })

            variants.push({ weight: face.weight, style: face.style as FontStyle, files })
        }

        for (const subset of definition.subsets) {
            if (! matchedSubsets.has(subset)) {
                throw new Error(
                    `laravel-vite-plugin: Fontsource subset "${subset}" not found in "${cssFile.fileName}" ` +
                    `in package "${packageName}" for font "${definition.family}". ` +
                    `Check that weight ${cssFile.weight}, style "${cssFile.style}", and subset "${subset}" are available.`
                )
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

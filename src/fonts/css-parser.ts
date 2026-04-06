import type { FontFormat, FontStyle, FontWeight, ParsedFontFace, ParsedFontSrc } from './types.js'

export function parseFontFaceCss(css: string): ParsedFontFace[] {
    const results: ParsedFontFace[] = []
    const ruleRegex = /@font-face\s*\{([^}]+)\}/g

    let match
    while ((match = ruleRegex.exec(css)) !== null) {
        const block = match[1]
        const face = parseFontFaceBlock(block)

        if (face) {
            results.push(face)
        }
    }

    return results
}

function parseFontFaceBlock(block: string): ParsedFontFace|null {
    const family = extractDescriptor(block, 'font-family')
    const style = extractDescriptor(block, 'font-style')
    const weight = extractDescriptor(block, 'font-weight')
    const src = extractDescriptor(block, 'src')
    const unicodeRange = extractDescriptor(block, 'unicode-range')
    const display = extractDescriptor(block, 'font-display')

    if (! family || ! src) {
        return null
    }

    const cleanFamily = family.replace(/['"]/g, '').trim()
    const parsedSrc = parseSrcDescriptor(src)

    if (parsedSrc.length === 0) {
        return null
    }

    return {
        family: cleanFamily,
        style: (style as FontStyle) ?? 'normal',
        weight: parseWeight(weight ?? '400'),
        src: parsedSrc,
        unicodeRange: unicodeRange ?? undefined,
        display: display ?? undefined,
    }
}

function extractDescriptor(block: string, name: string): string|null {
    const match = new RegExp(`${name}\\s*:\\s*([^;]+)`, 'i').exec(block)

    return match ? match[1].trim() : null
}

function parseSrcDescriptor(src: string): ParsedFontSrc[] {
    const results: ParsedFontSrc[] = []
    const urlRegex = /url\(["']?([^"')]+)["']?\)\s*format\(["']?([^"')]+)["']?\)/g

    let match
    while ((match = urlRegex.exec(src)) !== null) {
        const url = match[1]
        const format = normalizeFormat(match[2])

        if (format) {
            results.push({ url, format })
        }
    }

    if (results.length === 0) {
        const simpleUrlRegex = /url\(["']?([^"')]+)["']?\)/g
        while ((match = simpleUrlRegex.exec(src)) !== null) {
            const url = match[1]
            const format = inferFormatFromUrl(url)

            if (format) {
                results.push({ url, format })
            }
        }
    }

    return results
}

function parseWeight(weight: string): FontWeight {
    const trimmed = weight.trim()

    return /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : trimmed
}

function normalizeFormat(format: string): FontFormat|null {
    const map: Record<string, FontFormat> = {
        'woff2': 'woff2',
        'woff': 'woff',
        'ttf': 'ttf',
        'truetype': 'ttf',
        'otf': 'otf',
        'opentype': 'otf',
        'eot': 'eot',
        'embedded-opentype': 'eot',
    }

    return map[format.toLowerCase()] ?? null
}

function inferFormatFromUrl(url: string): FontFormat|null {
    const ext = url.match(/\.([^.]+)$/)?.[1]

    return ext ? normalizeFormat(ext) : null
}

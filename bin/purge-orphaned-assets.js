#!/usr/bin/env node

import { readFileSync, readdirSync, unlinkSync } from 'fs'
import { dirname } from 'path'

/*
 * Argv helpers.
 */

const argument = (name, fallback) => {
    const index = process.argv.findIndex(argument => argument.startsWith(`--${name}=`))

    return index === -1
        ? fallback()
        : process.argv[index].substring(`--${name}=`.length)
}

const option = (name) => process.argv.includes(`--${name}`)

/*
 * Configuration.
 */

const dryRun = option(`dry-run`)
const quiet = option(`quiet`)
const wantsSsr = option('ssr')
const manifestPath = argument(`manifest`, () => wantsSsr ? `./bootstrap/ssr/ssr-manifest.json` : `./public/build/manifest.json`)
const assetsDirectory = argument(`assets`, () => `${dirname(manifestPath)}/assets`)

/*
 * Helpers.
 */

const write = quiet ? (() => undefined) : console.log

/*
 * Clean.
 */

const main = () => {
    write(`Reading manifest [${manifestPath}].`)

    const manifest = JSON.parse(readFileSync(manifestPath).toString())

    const manifestKeys = Object.keys(manifest)

    const isSsr = Array.isArray(manifest[manifestKeys[0]])

    if (wantsSsr && ! isSsr) {
        write('Did not find an SSR manifest.')

        process.exit(1)
    }

    isSsr
        ? write(`SSR manifest found.`)
        : write(`Non-SSR manifest found.`)

    const manifestAssets = isSsr
        ? manifestKeys.flatMap(key => manifest[key])
        : manifestKeys.map(key => manifest[key].file)

    write(`Verify assets in [${assetsDirectory}].`)

    const allAssets = readdirSync(assetsDirectory, { withFileTypes: true })

    const orphanedAssets = allAssets.filter(file => file.isFile())
        .filter(file => manifestAssets.findIndex(asset => asset.endsWith(`/${file.name}`)) === -1)

    if (orphanedAssets.length === 0) {
        write(`No ophaned assets found.`)
    } else {
        orphanedAssets.length === 1
            ? write(`[${orphanedAssets.length}] orphaned asset found.`)
            : write(`[${orphanedAssets.length}] orphaned assets found.`)

        orphanedAssets.forEach(asset => {
            const path = `${assetsDirectory}/${asset.name}`

            dryRun
                ? write(`Orphaned asset [${path}] would be removed.`)
                : write(`Removing orphaned asset [${path}].`)

            if (! dryRun) {
                unlinkSync(path)
            }
        })
    }
}

main()

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
const info = quiet ? (() => undefined) : console.log
const error = quiet ? (() => undefined) : console.error

/*
 * Clean.
 */

const main = () => {
    info(`Reading manifest [${manifestPath}].`)

    const manifest = JSON.parse(readFileSync(manifestPath).toString())

    const manifestKeys = Object.keys(manifest)

    const isSsr = Array.isArray(manifest[manifestKeys[0]])

    if (wantsSsr && ! isSsr) {
        error('Did not expected SSR manifest.')

        process.exit(1)
    }

    isSsr
        ? info(`SSR manifest found.`)
        : info(`Non-SSR manifest found.`)

    const manifestAssets = isSsr
        ? manifestKeys.flatMap(key => manifest[key])
        : manifestKeys.map(key => manifest[key].file)

    info(`Verify assets in [${assetsDirectory}].`)

    const allAssets = readdirSync(assetsDirectory, { withFileTypes: true })

    const orphanedAssets = allAssets.filter(file => file.isFile())
        .filter(file => manifestAssets.findIndex(asset => asset.endsWith(`/${file.name}`)) === -1)

    if (orphanedAssets.length === 0) {
        info(`No ophaned assets found.`)
    } else {
        orphanedAssets.length === 1
            ? info(`[${orphanedAssets.length}] orphaned asset found.`)
            : info(`[${orphanedAssets.length}] orphaned assets found.`)

        orphanedAssets.forEach(asset => {
            const path = `${assetsDirectory}/${asset.name}`

            dryRun
                ? info(`Orphaned asset [${path}] would be removed.`)
                : info(`Removing orphaned asset [${path}].`)

            if (! dryRun) {
                unlinkSync(path)
            }
        })
    }
}

main()

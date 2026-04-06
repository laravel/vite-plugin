import type { FontsourceProviderConfig } from '../types.js'

export function fontsource(options?: { package?: string }): FontsourceProviderConfig {
    return {
        type: 'fontsource',
        package: options?.package,
    }
}

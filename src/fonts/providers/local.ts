import type { LocalProviderConfig } from '../types.js'

export function local(src: string|string[]): LocalProviderConfig {
    return {
        type: 'local',
        src,
    }
}

import { describe, expect, it, vi } from 'vitest'
import { generateFallbackMetrics } from '../src/fonts/fallback'

// Simulate fontaine not being installed: it is an optional peer dependency
// and optimizedFallbacks defaults to true, so this is a common state.
vi.mock('fontaine', () => {
    throw new Error("Cannot find package 'fontaine'")
})

describe('generateFallbackMetrics without fontaine installed', () => {
    it('warns that fontaine is required and returns undefined', async () => {
        const warn = vi.fn()

        const metrics = await generateFallbackMetrics('/fake/inter.woff2', warn)

        expect(metrics).toBeUndefined()
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toContain('fontaine')
        expect(warn.mock.calls[0][0]).toContain('optimizedFallbacks')
    })

    it('returns undefined without warning when no warn callback is given', async () => {
        await expect(generateFallbackMetrics('/fake/inter.woff2')).resolves.toBeUndefined()
    })
})

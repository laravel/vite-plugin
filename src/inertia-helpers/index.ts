export function resolvePageComponent<T>(path: string, pages: Record<string, () => Promise<T>>) {
    if (typeof pages[path] === 'undefined') {
        throw new Error(`Page not found: ${path}`)
    }

    return pages[path]()
}

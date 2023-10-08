export async function resolvePageComponent<T>(path: string, pages: Record<string, Promise<T> | (() => Promise<T>)>, fallback?: string): Promise<T> {
    let page = pages[path]

    if (typeof page === 'undefined') {
        if (typeof fallback === 'undefined' || typeof pages[fallback] === 'undefined') {
            throw new Error(`Page not found: ${path}`)
        }
        page = pages[fallback]
    }

    return typeof page === 'function' ? page() : page
}

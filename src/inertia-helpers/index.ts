export async function resolvePageComponent<T>(path: string, pages: Record<string, Promise<T> | (() => Promise<T>)>): Promise<T> {
    const page = pages[path]

    if (typeof page === 'undefined') {
        throw new Error(`Page not found: ${path}`)
    }

    return typeof page === 'function' ? page() : page
}

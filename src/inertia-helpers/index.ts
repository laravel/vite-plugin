export class PageNotFoundError extends Error {
    constructor(path: string) {
        super(`Page not found: ${path}`)
        this.name = 'PageNotFoundError'
    }
}

export async function resolvePageComponent<T>(path: string, pages: Record<string, Promise<T> | (() => Promise<T>)>): Promise<T> {
    const page = pages[path]

    if (typeof page === 'undefined') {
        throw new PageNotFoundError(path)
    }

    return typeof page === 'function' ? page() : page
}

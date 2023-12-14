export async function resolvePageComponent<T>(path: string, pages: Record<string, Promise<T> | (() => Promise<T>)>, fallback?: string|((path: string) => Promise<T>)): Promise<T> {
    let page = pages[path]

    if (typeof page === 'undefined' && typeof fallback === 'string') {
        page = pages[fallback]
    }

    if (typeof page !== 'undefined') {
        return typeof page === 'function' ? page() : page
    }

    if (typeof fallback === 'function') {
        return fallback(path)
    }

    throw new PageNotFoundError(`Page not found: [${path}].`)
}

export class PageNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PageNotFoundError'
  }
}

/**
 * Builder pattern for constructing URLs with query parameters
 * Provides a fluent API for building URLs consistently
 */
export class UrlBuilder {
    private baseUrl: string;
    private urlPath: string = '';
    private queryParamsMap: Map<string, string> = new Map();

    private constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Create a new URL builder instance
     */
    static create(baseUrl: string): UrlBuilder {
        return new UrlBuilder(baseUrl);
    }

    /**
     * Set the path segment of the URL
     */
    path(path: string): this {
        this.urlPath = path.startsWith('/') ? path : `/${path}`;
        return this;
    }

    /**
     * Add a query parameter
     */
    queryParam(key: string, value: string | number | undefined | null): this {
        if (value !== undefined && value !== null) {
            this.queryParamsMap.set(key, String(value));
        }
        return this;
    }

    /**
     * Add multiple query parameters at once
     */
    queryParams(params: Record<string, string | number | undefined | null>): this {
        Object.entries(params).forEach(([key, value]) => {
            this.queryParam(key, value);
        });
        return this;
    }

    /**
     * Build and return the final URL string
     */
    build(): string {
        let url = this.baseUrl;

        if (this.urlPath) {
            url += this.urlPath;
        }

        if (this.queryParamsMap.size > 0) {
            const queryString = Array.from(this.queryParamsMap.entries())
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            url += `?${queryString}`;
        }

        return url;
    }

    /**
     * Build URL using URLSearchParams (for compatibility with existing code)
     */
    buildWithSearchParams(): string {
        let url = this.baseUrl;

        if (this.urlPath) {
            url += this.urlPath;
        }

        if (this.queryParamsMap.size > 0) {
            const searchParams = new URLSearchParams();
            this.queryParamsMap.forEach((value, key) => {
                searchParams.append(key, value);
            });
            url += `?${searchParams.toString()}`;
        }

        return url;
    }
}


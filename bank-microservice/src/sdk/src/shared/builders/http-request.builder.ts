import { Injectable } from '@nestjs/common';
import type { HttpRequestConfig } from '../interfaces/https-client.interface';

@Injectable()
export class HttpRequestBuilder {
    private config: HttpRequestConfig = {
        headers: { 'Content-Type': 'application/json' },
    };

    /**
     * Set the HTTP method
     */
    method(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): this {
        this.config.method = method;
        return this;
    }

    /**
     * Set the request URL
     */
    url(url: string): this {
        this.config.url = url;
        return this;
    }

    /**
     * Set the base URL
     */
    baseUrl(baseUrl: string): this {
        this.config.baseURL = baseUrl;
        return this;
    }

    /**
     * Set request headers (merges with existing headers)
     */
    headers(headers: Record<string, string>): this {
        this.config.headers = {
            ...this.config.headers,
            ...headers,
        };
        return this;
    }

    /**
     * Set a single header
     */
    header(key: string, value: string): this {
        if (!this.config.headers) {
            this.config.headers = {};
        }
        this.config.headers[key] = value;
        return this;
    }

    /**
     * Set query parameters
     */
    params(params: Record<string, any>): this {
        this.config.params = params;
        return this;
    }

    /**
     * Set request body/data
     */
    data(data: any): this {
        this.config.data = data;
        return this;
    }

    /**
     * Set request timeout
     */
    timeout(timeout: number): this {
        this.config.timeout = timeout;
        return this;
    }

    /**
     * Build and return the final request configuration
     */
    build(): HttpRequestConfig {
        const config = { ...this.config };
        // Reset for next build
        this.reset();
        return config;
    }

    /**
     * Reset the builder to initial state
     */
    reset(): this {
        this.config = {
            headers: { 'Content-Type': 'application/json' },
        };
        return this;
    }

    /**
     * Create a new builder instance for GET request
     */
    static get(url: string): HttpRequestBuilder {
        return new HttpRequestBuilder().method('GET').url(url);
    }

    /**
     * Create a new builder instance for POST request
     */
    static post(url: string, data?: any): HttpRequestBuilder {
        const builder = new HttpRequestBuilder().method('POST').url(url);
        if (data !== undefined) {
            builder.data(data);
        }
        return builder;
    }

    /**
     * Create a new builder instance for PUT request
     */
    static put(url: string, data?: any): HttpRequestBuilder {
        const builder = new HttpRequestBuilder().method('PUT').url(url);
        if (data !== undefined) {
            builder.data(data);
        }
        return builder;
    }

    /**
     * Create a new builder instance for DELETE request
     */
    static delete(url: string): HttpRequestBuilder {
        return new HttpRequestBuilder().method('DELETE').url(url);
    }
}


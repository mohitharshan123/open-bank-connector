import {
    StandardAccount,
    StandardBalance,
} from '../types/common';
import { IHttpClient } from '../interfaces/https-client.interface';

/**
 * Base interface that all providers must implement
 */
export interface IProvider {
    /**
     * Get account details
     */
    getAccount(): Promise<StandardAccount>;

    /**
     * Get account balances
     */
    getBalances(): Promise<StandardBalance[]>;

    /**
     * Get the provider name
     */
    getProviderName(): string;
}

/**
 * Abstract base class for providers with common HTTP functionality
 */
export abstract class BaseProvider implements IProvider {
    protected httpClient: IHttpClient;
    protected config: any;

    constructor(httpClient: IHttpClient, config: any) {
        this.httpClient = httpClient;
        this.config = config;
    }

    abstract getAccount(): Promise<StandardAccount>;
    abstract getBalances(): Promise<StandardBalance[]>;
    abstract getProviderName(): string;

    /**
     * Helper method to make authenticated requests
     */
    protected async request<T>(
        method: string,
        url: string,
        options?: { params?: Record<string, unknown>; data?: unknown; headers?: Record<string, string> }
    ): Promise<T> {
        try {
            const response = await this.httpClient.request<T>({
                method,
                url,
                params: options?.params,
                data: options?.data,
                headers: options?.headers || { 'Content-Type': 'application/json' },
            });
            return response.data;
        } catch (error: any) {
            throw new Error(
                `Provider ${this.getProviderName()} request failed: ${error.message || 'Unknown error'}`
            );
        }
    }
}


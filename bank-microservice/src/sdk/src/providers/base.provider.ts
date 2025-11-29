import { IHttpClient } from '../shared/interfaces/https-client.interface';
import {
    StandardAccount,
    StandardBalance,
    StandardJob,
} from '../shared/types/common';

/**
 * Base interface that all providers must implement
 */
export interface IProvider {
    /**
     * Authenticate with the provider
     */
    authenticate(userId?: string): Promise<any>;
    /**
     * Get account details (returns array of accounts)
     */
    getAccount(userId?: string): Promise<StandardAccount[]>;

    /**
     * Get account balances
     */
    getBalances(userId?: string): Promise<StandardBalance[]>;

    /**
     * Get jobs (Basiq-specific, returns empty array for other providers)
     */
    getJobs(userId?: string, jobId?: string): Promise<StandardJob[]>;

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
    abstract authenticate(userId?: string): Promise<any>;
    abstract getAccount(userId?: string): Promise<StandardAccount[]>;
    abstract getBalances(userId?: string): Promise<StandardBalance[]>;
    abstract getJobs(userId?: string, jobId?: string): Promise<StandardJob[]>;
    abstract getProviderName(): string;

    /**
     * Helper method to make authenticated requests
     */
    protected async request<T>(
        method: string,
        url: string,
        options?: { baseURL?: string; params?: Record<string, unknown>; data?: unknown; headers?: Record<string, string> }
    ): Promise<T> {
        try {
            const response = await this.httpClient.request<T>({
                method,
                url,
                baseURL: options?.baseURL,
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


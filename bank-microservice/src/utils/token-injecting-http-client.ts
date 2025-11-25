import { HttpRequestConfig, HttpResponse, IHttpClient } from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';

interface TokenInjectionConfig {
    supportsRefresh: boolean;
    expirationBufferMs: number;
    injectHeader: (config: HttpRequestConfig, token: string) => void;
}

export class TokenInjectingHttpClient implements IHttpClient {
    private readonly config: TokenInjectionConfig;

    constructor(
        private readonly baseClient: IHttpClient,
        private readonly providerType: ProviderType,
        private readonly tokenService: TokenService,
        private readonly refreshCallback?: () => Promise<any>,
    ) {
        this.config = this.getProviderConfig(providerType);
    }

    async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
        await this.injectToken(config);
        return this.baseClient.request<T>(config);
    }

    async get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        const fullConfig = { ...config, url, method: 'GET' };
        await this.injectToken(fullConfig);
        return this.baseClient.get<T>(url, fullConfig);
    }

    async post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        const fullConfig = { ...config, url, method: 'POST', data };
        await this.injectToken(fullConfig);
        return this.baseClient.post<T>(url, data, fullConfig);
    }

    async put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        const fullConfig = { ...config, url, method: 'PUT', data };
        await this.injectToken(fullConfig);
        return this.baseClient.put<T>(url, data, fullConfig);
    }

    async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        const fullConfig = { ...config, url, method: 'DELETE' };
        await this.injectToken(fullConfig);
        return this.baseClient.delete<T>(url, fullConfig);
    }

    private getProviderConfig(providerType: ProviderType): TokenInjectionConfig {
        const configs: Map<ProviderType, TokenInjectionConfig> = new Map([
            [
                ProviderType.AIRWALLEX,
                {
                    supportsRefresh: true,
                    expirationBufferMs: 5 * 60 * 1000,
                    injectHeader: (config, token) => {
                        config.headers = config.headers || {};
                        config.headers['Authorization'] = `Bearer ${token}`;
                    },
                },
            ],
            [
                ProviderType.BASIQ,
                {
                    supportsRefresh: true,
                    expirationBufferMs: 5 * 60 * 1000,
                    injectHeader: (config, token) => {
                        config.headers = config.headers || {};
                        config.headers['Authorization'] = `Bearer ${token}`;
                        config.headers['basiq-version'] = '3.0';
                    },
                },
            ],
        ]);

        const config = configs.get(providerType);
        if (!config) {
            return {
                supportsRefresh: false,
                expirationBufferMs: 0,
                injectHeader: () => { },
            };
        }

        return config;
    }

    private async injectToken(config: HttpRequestConfig): Promise<void> {
        try {
            let token = await this.getTokenForProvider();

            if (!token && this.config.supportsRefresh && this.refreshCallback) {
                try {
                    token = await this.tokenService.getValidToken(
                        this.providerType,
                        this.refreshCallback,
                    );
                } catch (refreshError) {
                    console.error(
                        `Failed to refresh token for ${this.providerType}: ${refreshError.message}`,
                        refreshError.stack,
                    );
                    throw refreshError;
                }
            }

            if (token) {
                this.config.injectHeader(config, token);
            }
        } catch (error) {
            console.error(`Failed to inject token for ${this.providerType}:`, error);
        }
    }

    private async getTokenForProvider(): Promise<string | null> {
        try {
            const tokenDoc = await this.tokenService.getActiveToken(this.providerType);

            if (!tokenDoc) {
                return null;
            }

            if (this.config.expirationBufferMs > 0) {
                const isValid =
                    new Date(tokenDoc.expiresAt.getTime() - this.config.expirationBufferMs) >
                    new Date();

                if (!isValid) {
                    return null;
                }
            }

            return tokenDoc.token;
        } catch (error) {
            return null;
        }
    }
}

